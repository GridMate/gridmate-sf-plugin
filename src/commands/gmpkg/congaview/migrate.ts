/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
/* @typescript-eslint/no-unsafe-member-access */
/* @typescript-eslint/no-unsafe-call */
/* eslint-disable-next-line class-methods-use-this */

import * as path from 'path';
import * as fs from 'fs';

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Connection, Messages } from '@salesforce/core';
import { Record } from 'jsforce';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('gmpkg', 'gmpkg.congaview.migrate');
const colorings = JSON.parse(String(fs.readFileSync('.coloringrc.json')));

export type JsonRecord = {
  [field: string]: any;
};

export type OutputRecord = {
  fullName: string;
  metadata: {
    Id: string;
    fullName: string;
    label: string;
    objectApiName: string;
    description: string;
    owner: unknown;
    columns: unknown;
    cellColoring: unknown;
    columnStyle: unknown;
    groupBy: unknown;
    aggregate: unknown;
    filter: unknown;
    searchFields: unknown;
    sort: unknown;
    pageSize: number;
    frozenColumns: number;
    showColumnBorder: boolean;
    showRecordDetails: boolean;
    enableSplitView: boolean;
    related: unknown;
    actions: unknown;
  };
};

export type OutputRelatedRecord = {
  fullName: string;
  metadata: {
    fullName: string;
    label: string;
    objectApiName: string;
    owner: unknown;
    columns: unknown;
    columnStyle: unknown;
    filter: unknown;
    groupBy: unknown;
    sort: unknown;
    pageSize: number;
    showColumnBorder: boolean;
    actions: unknown;
  };
};

export type OutputRelatedComponent = {
  component: string;
  attributes: {
    userGridId: string;
    userGridApiName: string;
    adminFilter: string;
  };
};

export default class CongaViewMigrate extends SfCommand<boolean> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.targetOrg.summary'),
      required: true,
    }),

    file: Flags.string({
      summary: messages.getMessage('flags.file.summary'),
      char: 'f',
      required: true,
    }),

    directory: Flags.string({
      summary: messages.getMessage('flags.directory.summary'),
      char: 'd',
      required: true,
    }),

    'api-version': Flags.orgApiVersion({
      summary: messages.getMessage('flags.orgApiVersion.summary'),
      required: true,
    }),
  };

  private connection: Connection | undefined;
  private congaViewCache: Record[] = [];

  public async run(): Promise<boolean> {
    const { flags } = await this.parse(CongaViewMigrate);

    this.connection = flags['target-org'].getConnection(flags['api-version']);
    await this.buildCache();

    const inputRec: JsonRecord = JSON.parse(String(fs.readFileSync(flags.file)));
    return this.migrateCongaView(inputRec, flags);
  }

  private migrateCongaView(inputRec: JsonRecord, flags: any): boolean {
    const outputRec: OutputRecord = {
      fullName: `${String(inputRec.Name.replace(' ', '_'))}_${String(inputRec.Id)}`,
      metadata: {
        Id: inputRec.Id,
        fullName: `${String(inputRec.Name.replace(' ', '_'))}_${String(inputRec.Id)}`,
        label: inputRec.Name,
        objectApiName: inputRec.CRMC_PP__ObjectName__c,
        description: inputRec.CRMC_PP__Description__c,
        owner: this.buildOwner(inputRec),
        columns: this.buildColumns(inputRec.CRMC_PP__JSON__c),
        cellColoring: this.buildCellColoring(inputRec.CRMC_PP__JSON__c),
        columnStyle: this.buildColumnStyle(inputRec.CRMC_PP__JSON__c),
        groupBy: this.buildGroupBy(inputRec.CRMC_PP__JSON__c),
        aggregate: this.buildAggregate(inputRec.CRMC_PP__JSON__c),
        filter: this.buildFilter(inputRec.CRMC_PP__JSON__c),
        searchFields: this.buildSearchFields(inputRec.CRMC_PP__JSON__c),
        sort: this.buildSort(inputRec.CRMC_PP__JSON__c),
        pageSize: inputRec.CRMC_PP__JSON__c.takeCount / 10,
        frozenColumns: 0,
        showColumnBorder: true,
        showRecordDetails: false,
        enableSplitView: this.buildEnableSplitView(inputRec.CRMC_PP__JSON__c),
        actions: this.buildActions(inputRec.CRMC_PP__JSON__c),
        related: this.buildRelated(inputRec, flags),
      },
    };

    this.saveRecord(outputRec, flags.directory);
    return true;
  }

  private buildOwner(inputRec: JsonRecord): unknown {
    const congaView = this.congaViewCache.find((x) => x.Id === inputRec.Id);

    return {
      Id: String(congaView?.OwnerId),
      username: String(congaView?.Owner.Username),
    };
  }

  private buildColumns(inputRec: JsonRecord): unknown {
    if (inputRec.displayColumns) {
      return inputRec.displayColumns
        .filter((x: JsonRecord) => x.field)
        .sort((a: JsonRecord, b: JsonRecord) => b.ordinal - a.ordinal)
        .map((x: JsonRecord) => x.field);
    }
  }

  private buildCellColoring(inputRec: JsonRecord): unknown {
    if (inputRec.conditionalRules) {
      return Object.keys(inputRec.conditionalRules).reduce((acc: any, fieldKey: string) => {
        const coloringField = inputRec.conditionalRules[fieldKey];

        acc[fieldKey] = Object.keys(coloringField).map((ruleKey) => ({
          color: coloringField[ruleKey].backColor,
          exp: colorings[coloringField[ruleKey].expression],
          label: ruleKey,
        }));

        return acc;
      }, {});
    }
  }

  private buildColumnStyle(inputRec: JsonRecord): unknown {
    if (inputRec.displayColumns) {
      return inputRec.displayColumns
        .filter((x: JsonRecord) => x.field)
        .sort((a: JsonRecord, b: JsonRecord) => b.ordinal - a.ordinal)
        .reduce((res: JsonRecord, x: JsonRecord) => {
          const width = parseInt(x.width, 10);
          res[x.field] = `width:${width}px;`;
          return res;
        }, {});
    }
  }

  private buildGroupBy(inputRec: JsonRecord): unknown {
    if (inputRec.groups) {
      return inputRec.groups.map((x: JsonRecord) => x.field);
    }
  }

  private buildAggregate(inputRec: JsonRecord): unknown {
    if (inputRec.groups) {
      const aggregate: JsonRecord = {};
      inputRec.groups.forEach((grp: JsonRecord) => {
        grp.aggregates.forEach((agg: JsonRecord) => {
          if (agg.aggregate !== 'count') {
            if (!aggregate.field) {
              aggregate[agg.field] = agg.aggregate;
            }
          }
        });
      });

      return aggregate;
    }
  }

  private buildActions(inputRec: JsonRecord): unknown {
    // To Review
    if (inputRec.toolbarState) {
      const defaultActions = [
        'Views',
        'Add',
        'Edit',
        'Actions',
        'CustomActions',
        'Search',
        'Reading Pane',
        'Configure',
        'Reset View',
        'Utility',
      ];

      return Object.keys(inputRec.toolbarState)
        .filter((key) => !defaultActions.includes(key))
        .filter((key) => inputRec.toolbarState[key].visible)
        .map((key) => ({
          label: key,
          name: key,
        }));
    }
  }

  private buildFilter(inputRec: JsonRecord): unknown {
    if (inputRec.filter) {
      return {
        type: 'Advanced',
        value: this.parseFilter(inputRec.filter),
      };
    }

    return {
      type: 'Advanced',
      value: { and: [] },
    };
  }

  private parseFilter(inputRec: JsonRecord): unknown {
    if (inputRec.logic) {
      return {
        [inputRec.logic]: this.parseFilter(inputRec.filters),
      };
    } else if (Array.isArray(inputRec)) {
      return inputRec.map((filter: JsonRecord) => this.parseFilter(filter));
    } else if (typeof inputRec === 'object') {
      return {
        [inputRec.field]: this.getExpression('soql', inputRec.operator, inputRec.value),
      };
    }
  }

  private buildSearchFields(inputRec: JsonRecord): unknown {
    // Not supported by Conga as of Today
    return [];
  }

  private buildSort(inputRec: JsonRecord): unknown {
    if (inputRec.sorts) {
      return inputRec.sorts.map((x: JsonRecord) => ({
        fieldApiName: x.field,
        order: x.dir,
      }));
    }
  }

  private buildRelated(inputRec: JsonRecord, flags: any): unknown {
    const relatedList: any = [];
    const childGridSettings = inputRec.CRMC_PP__JSON__c.childGridSettings;

    if (childGridSettings && Object.keys(childGridSettings).length > 0) {
      Object.keys(childGridSettings).forEach((relatedKey) => {
        const relatedRec: JsonRecord = childGridSettings[relatedKey];

        if (relatedRec.objectName && relatedRec.displayColumns) {
          const outputRec: OutputRelatedRecord = {
            fullName: `${String(inputRec.Name.replace(' ', '_'))}-${relatedKey}`,
            metadata: {
              label: relatedKey,
              objectApiName: relatedRec.objectName,
              fullName: `${String(inputRec.Name.replace(' ', '_'))}-${relatedKey}`,
              owner: this.buildOwner(inputRec),
              columns: this.buildColumns(relatedRec),
              columnStyle: this.buildColumnStyle(relatedRec),
              filter: this.buildFilter(relatedRec),
              groupBy: this.buildGroupBy(relatedRec),
              sort: this.buildSort(relatedRec),
              pageSize: relatedRec.takeCount / 10,
              actions: this.buildActions(relatedRec),
              showColumnBorder: true,
            },
          };

          if (this.saveRelatedRecord(outputRec, flags.directory)) {
            const relatedFilter = `{"${String(relatedRec.fkField)}":{"operator":"=","value":"$recordId"}}`;

            relatedList.push({
              type: 'GM - User Grid',
              key: relatedKey,
              label: relatedKey,
              props: `Filter : ${relatedFilter}`,
              component: 'gmpkg:UserDataGridComponent',
              attributes: {
                userGridApiName: outputRec.fullName,
                adminFilter: relatedFilter,
                density: 'compact',
              },
            });
          } else {
            this.error(`Cannot save related grid ${relatedKey}`);
          }
        }
      });

      return relatedList;
    }
  }

  private buildEnableSplitView(inputRec: JsonRecord): boolean {
    if (inputRec.readingPane) {
      return inputRec.readingPane.position === 'right';
    }

    return false;
  }

  private getExpression(interpreter: string, fromOp: string, fromValue: unknown): unknown {
    const operatorMap: JsonRecord = {
      eq: '=',
      neq: '!=',
      contains: 'like',
      doesnotcontain: 'notLike',
      includes: 'includes',
      dynamic: 'dynamic',
      isnull: 'isnull',
      lte: '<=',
      gte: '>=',
      lt: '<',
      gt: '>',
    };

    const targetOp = operatorMap[fromOp];

    if (!targetOp) {
      this.error(`Operator ${fromOp} not supported`);
    }

    // Dynamic operator
    if (targetOp === 'dynamic') {
      return {
        operator: '=',
        value: '$USER.Name',
      };
    }

    // Isnull operator
    if (targetOp === 'isnull') {
      return {
        operator: '=',
        value: null,
      };
    }

    // Includes operator and soql expression
    if (targetOp === 'includes' && interpreter === 'soql') {
      return {
        operator: 'includes',
        value: `('${String(fromValue).split(',').join("','")}')`,
      };
    }

    // Includes operator and javascript expression
    if (targetOp === 'includes' && interpreter === 'javascript') {
      return {
        operator: 'includes',
        value: String(fromValue).split(','),
      };
    }

    return {
      operator: targetOp,
      value: fromValue,
    };
  }

  private saveRecord(outputRec: OutputRecord, directory: string): boolean {
    const filePath = path.join(
      directory,
      `${outputRec.metadata.objectApiName}/`,
      String(outputRec.fullName).replaceAll('/', '_').replaceAll(' ', '_')
    );

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(`${filePath}.json`, JSON.stringify(outputRec.metadata, null, 2));

    return true;
  }

  private saveRelatedRecord(outputRec: OutputRelatedRecord, directory: string): boolean {
    const filePath = path.join(
      directory,
      `${outputRec.metadata.objectApiName}/`,
      String(outputRec.fullName).replaceAll('/', '_').replaceAll(' ', '_')
    );

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(`${filePath}.json`, JSON.stringify(outputRec.metadata, null, 2));

    return true;
  }

  private async buildCache(): Promise<boolean> {
    if (this.connection) {
      this.congaViewCache = (
        await this.connection.query('SELECT Id, Name, OwnerId, Owner.Username FROM CRMC_PP__GridView__c')
      ).records;
    }

    return true;
  }
}
