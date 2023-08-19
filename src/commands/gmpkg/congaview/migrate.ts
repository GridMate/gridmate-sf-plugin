/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/no-for-in-array */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable class-methods-use-this */

import * as path from 'path';
import * as fs from 'fs';

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Connection, Messages } from '@salesforce/core';
import { Record, Field } from 'jsforce';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('gmpkg', 'gmpkg.congaview.migrate');

const coloringConfigFile = process.env.COLORING_CFG_FILE || `${path.resolve(__dirname, '.coloringrc.json')}`;
const colorings = JSON.parse(String(fs.readFileSync(coloringConfigFile)));

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

  private async migrateCongaView(inputRec: JsonRecord, flags: any): Promise<boolean> {
    const outputRec: OutputRecord = {
      fullName: `${String(inputRec.Name.replaceAll(' ', '_'))}`,
      metadata: {
        Id: inputRec.Id,
        fullName: `${String(inputRec.Name.replaceAll(' ', '_'))}`,
        label: inputRec.Name,
        objectApiName: inputRec.CRMC_PP__ObjectName__c,
        description: inputRec.CRMC_PP__Description__c,
        owner: this.buildOwner(inputRec),
        columns: await this.buildColumns(inputRec.CRMC_PP__JSON__c),
        columnStyle: this.buildColumnStyle(inputRec.CRMC_PP__JSON__c),
        cellColoring: this.buildCellColoring(inputRec.CRMC_PP__JSON__c),
        groupBy: this.buildGroupBy(inputRec.CRMC_PP__JSON__c),
        aggregate: this.buildAggregate(inputRec.CRMC_PP__JSON__c),
        filter: await this.buildFilter(inputRec.CRMC_PP__JSON__c),
        searchFields: this.buildSearchFields(inputRec.CRMC_PP__JSON__c),
        sort: this.buildSort(inputRec.CRMC_PP__JSON__c),
        pageSize: inputRec.CRMC_PP__JSON__c.takeCount ? Math.min(inputRec.CRMC_PP__JSON__c.takeCount, 50) : 50,
        frozenColumns: 0,
        showColumnBorder: true,
        showRecordDetails: false,
        enableSplitView: this.buildEnableSplitView(inputRec.CRMC_PP__JSON__c),
        actions: this.buildActions(inputRec.CRMC_PP__JSON__c),
        related: await this.buildRelated(inputRec, flags),
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

  private async buildColumns(inputRec: JsonRecord): Promise<unknown> {
    if (inputRec.displayColumns) {
      const columns = inputRec.displayColumns
        .filter((x: JsonRecord) => x.field)
        .sort((a: JsonRecord, b: JsonRecord) => a.ordinal - b.ordinal);

      for (const x of columns) {
        x.targetField = x.field;

        if (x.field.includes('.')) {
          const fieldDesc = await this.getSubFieldDesc(x.field, inputRec.objectName);

          if (fieldDesc.nameField) {
            let lookupField = x.field.split('.').slice(0, -1).join('.');

            if (lookupField.endsWith('__r')) {
              const pathList = lookupField.split('.');
              pathList.push(pathList.pop().replace('__r', '__c'));

              lookupField = pathList.join('.');
            } else {
              lookupField = `${String(lookupField)}Id`;
            }

            x.targetField = lookupField;
          }
        }
      }

      return columns.map((x: JsonRecord) => x.targetField);
    }
  }

  private buildColumnStyle(inputRec: JsonRecord): unknown {
    if (inputRec.displayColumns) {
      const columStyle = inputRec.displayColumns
        .filter((x: JsonRecord) => x.field)
        .sort((a: JsonRecord, b: JsonRecord) => b.ordinal - a.ordinal)
        .reduce((res: JsonRecord, x: JsonRecord) => {
          const width = parseInt(x.width, 10);
          res[x.targetField] = `width:${width}px;`;
          return res;
        }, {});

      // eslint-disable-next-line camelcase
      columStyle.gm__header = 'width:120px;';

      return columStyle;
    }
  }

  private getDisplayedColumn(inputRec: JsonRecord, field: string): JsonRecord {
    return inputRec.displayColumns.find((c: JsonRecord) => c.field === field);
  }

  private buildCellColoring(inputRec: JsonRecord): unknown {
    if (inputRec.conditionalRules) {
      return Object.keys(inputRec.conditionalRules).reduce((acc: any, fieldKey: string) => {
        const coloringField = inputRec.conditionalRules[fieldKey];

        const displayCol = this.getDisplayedColumn(inputRec, fieldKey);
        if (!displayCol) this.warn(`Invalid coloring column ${String(fieldKey)}`);

        acc[displayCol.targetField] = Object.keys(coloringField).map((ruleKey) => {
          const coloring = coloringField[ruleKey];
          const coloringExp = colorings[coloring.expression];

          if (!coloringExp) {
            this.warn(`Not mapped coloring : field => ${fieldKey}, exp => ${String(coloring.expression)}`);
          }

          return {
            color: coloring.backColor,
            exp: coloringExp,
            label: ruleKey,
          };
        });

        return acc;
      }, {});
    }
  }

  private buildGroupBy(inputRec: JsonRecord): unknown {
    if (inputRec.groups) {
      return inputRec.groups.map((x: JsonRecord) => {
        const displayCol = this.getDisplayedColumn(inputRec, x.field);
        if (!displayCol) this.warn(`Invalid grouping column ${String(x.field)}`);

        return displayCol.targetField;
      });
    }
  }

  private buildAggregate(inputRec: JsonRecord): unknown {
    if (inputRec.groups) {
      const aggregate: JsonRecord = {};
      inputRec.groups.forEach((grp: JsonRecord) => {
        grp.aggregates.forEach((agg: JsonRecord) => {
          if (agg.aggregate !== 'count') {
            const displayCol = this.getDisplayedColumn(inputRec, agg.field);
            if (!displayCol) this.warn(`Invalid aggregation column ${String(agg.field)}`);

            if (!aggregate[displayCol.targetField]) {
              aggregate[displayCol.targetField] = agg.aggregate;
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

  private async buildFilter(inputRec: JsonRecord): Promise<unknown> {
    if (inputRec.filter) {
      return {
        type: 'Advanced',
        value: await this.parseFilter(inputRec.filter, inputRec.objectName),
      };
    }

    return {
      type: 'Advanced',
      value: { and: [] },
    };
  }

  private async parseFilter(inputFilter: JsonRecord, objectName: string): Promise<unknown> {
    if (inputFilter.logic) {
      return {
        [inputFilter.logic]: await this.parseFilter(inputFilter.filters, objectName),
      };
    } else if (inputFilter.filters) {
      return {
        and: await this.parseFilter(inputFilter.filters, objectName),
      };
    } else if (Array.isArray(inputFilter)) {
      const filterList = [];

      for (const filter of inputFilter) {
        filterList.push(await this.parseFilter(filter, objectName));
      }

      return filterList;
    } else if (typeof inputFilter === 'object') {
      const objectDesc = await this.connection.describe$(objectName);

      if (inputFilter.field.includes('!')) {
        const relationship = objectDesc.childRelationships.find(
          (r) => r.relationshipName === inputFilter.field.split('!')[0]
        );

        if (relationship) {
          const childObjectDesc = await this.connection.describe$(relationship.childSObject);

          const fieldName = inputFilter.field.split('!')[1];
          const fieldDesc = fieldName.includes('.')
            ? await this.getSubFieldDesc(fieldName, relationship.childSObject)
            : childObjectDesc.fields.find((f) => f.name === fieldName);

          if (!fieldDesc) this.error(`${String(inputFilter.field)} is null`);

          const filterValue: any = this.getExpression('soql', fieldDesc, inputFilter.operator, inputFilter.value);

          return {
            [`with ${relationship.relationshipName}`]: {
              field: fieldName,
              childSObject: relationship.childSObject,
              operator: filterValue.operator,
              value: filterValue.value,
            },
          };
        }
      } else {
        const fieldDesc = inputFilter.field.includes('.')
          ? await this.getSubFieldDesc(inputFilter.field, objectName)
          : objectDesc?.fields.find((f) => f.name === inputFilter.field);

        if (!fieldDesc) this.error(`${String(inputFilter.field)} is null`);

        return {
          [inputFilter.field]: this.getExpression('soql', fieldDesc, inputFilter.operator, inputFilter.value),
        };
      }
    }
  }

  private async getSubFieldDesc(fieldPath: string, objectName: string): Promise<Field> {
    const objectDesc = await this.connection?.describe$(objectName);

    if (objectDesc) {
      const fieldApiName = this.getFieldApiName(fieldPath);
      const refFieldDesc = objectDesc.fields.find((f) => f.name === fieldApiName);

      if (refFieldDesc) {
        if (fieldPath.includes('.') && refFieldDesc.referenceTo) {
          if (refFieldDesc.referenceTo.length > 0) {
            for (const refObjType of refFieldDesc.referenceTo) {
              const pathList = fieldPath.split('.');
              pathList.splice(0, 1);

              const subRefFieldDesc = await this.getSubFieldDesc(pathList.join('.'), refObjType);

              if (subRefFieldDesc) return subRefFieldDesc;
            }
          }
        }

        return refFieldDesc;
      }
    }

    return null;
  }

  private getFieldApiName(fieldApiName: string): string {
    if (fieldApiName.includes('.')) {
      const apiName = fieldApiName.split('.')[0];
      if (apiName.endsWith('__r')) {
        return apiName.replace('__r', '__c');
      } else {
        return apiName + 'Id';
      }
    }

    return fieldApiName;
  }

  private buildSearchFields(inputRec: JsonRecord): unknown {
    return ['Name'];
  }

  private buildSort(inputRec: JsonRecord): unknown {
    if (inputRec.sorts) {
      return inputRec.sorts.map((x: JsonRecord) => ({
        fieldApiName: x.field,
        order: x.dir,
      }));
    }
  }

  private async buildRelated(inputRec: JsonRecord, flags: any): Promise<unknown> {
    const relatedList: any = [];
    const childGridSettings = inputRec.CRMC_PP__JSON__c.childGridSettings;
    const objectDesc = await this.connection.describe$(inputRec.CRMC_PP__ObjectName__c);

    if (childGridSettings && Object.keys(childGridSettings).length > 0) {
      for (const relatedKey of Object.keys(childGridSettings)) {
        const relatedRec: JsonRecord = childGridSettings[relatedKey];

        if (relatedRec.objectName && relatedRec.displayColumns) {
          const outputRec: OutputRelatedRecord = {
            fullName: `${String(inputRec.Name.replaceAll(' ', '_'))}-${relatedKey}`,
            metadata: {
              label: `${String(objectDesc.label)} - ${relatedKey.replace('__r', '')}`,
              objectApiName: relatedRec.objectName,
              fullName: `${String(inputRec.Name.replaceAll(' ', '_'))}-${relatedKey}`,
              owner: this.buildOwner(inputRec),
              columns: await this.buildColumns(relatedRec),
              columnStyle: this.buildColumnStyle(relatedRec),
              filter: await this.buildFilter(relatedRec),
              groupBy: this.buildGroupBy(relatedRec),
              sort: this.buildSort(relatedRec),
              pageSize: relatedRec.takeCount ? Math.min(relatedRec.takeCount, 50) : 50,
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
      }

      return relatedList;
    }
  }

  private buildEnableSplitView(inputRec: JsonRecord): boolean {
    const childGridSettings = inputRec.childGridSettings;
    return childGridSettings && Object.keys(childGridSettings).length > 0;
  }

  private getExpression(interpreter: string, fieldDesc: Field, fromOp: string, fromValue: unknown): unknown {
    const operatorMap: JsonRecord = {
      eq: fieldDesc.type !== 'picklist' ? '=' : 'in',
      neq: fieldDesc.type !== 'picklist' ? '!=' : 'not in',
      contains: 'like',
      doesnotcontain: 'notLike',
      includes: 'includes',
      excludes: 'excludes',
      dynamic: 'dynamic',
      isnull: 'isnull',
      isnotnull: 'isnotnull',
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

    // Isnull operator
    if (targetOp === 'isnotnull') {
      return {
        operator: '!=',
        value: null,
      };
    }

    // Includes operator and soql expression
    if (targetOp === 'includes' && interpreter === 'soql') {
      return {
        operator: 'includes',
        value: `('${String(fromValue)
          .split(',')
          .map((x) => x.trim())
          .join("','")}')`,
      };
    }

    // Excludes operator and soql expression
    if (targetOp === 'excludes' && interpreter === 'soql') {
      return {
        operator: 'excludes',
        value: `('${String(fromValue)
          .split(',')
          .map((x) => x.trim())
          .join("','")}')`,
      };
    }

    // Includes operator and javascript expression
    if (targetOp === 'includes' && interpreter === 'javascript') {
      return {
        operator: 'includes',
        value: String(fromValue)
          .split(',')
          .map((x) => x.trim()),
      };
    }

    // Excludes operator and javascript expression
    if (targetOp === 'excludes' && interpreter === 'javascript') {
      return {
        operator: 'excludes',
        value: String(fromValue)
          .split(',')
          .map((x) => x.trim()),
      };
    }

    // Picklist field
    if (fieldDesc.type === 'picklist' && interpreter === 'soql') {
      return {
        operator: targetOp,
        value: `('${String(fromValue)}')`,
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
