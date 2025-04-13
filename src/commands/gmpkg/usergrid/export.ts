/* eslint-disable no-await-in-loop */
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
/* eslint-disable-next-line no-await-in-loop */

import * as path from 'path';
import * as fs from 'fs';

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Connection, Messages } from '@salesforce/core';
import { Record } from 'jsforce';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('gmpkg', 'gmpkg.usergrid.export');

export type OutputRecord = {
  fullName: string;
  metadata: {
    Id: string;
    fullName: string;
    label: string;
    objectApiName: string;
    description: string;
    createdDate: string;
    createdById: string;
    lastModifiedDate: string;
    lastModifiedById: string;
    owner: OutputOwnerProperty;
    formulas: unknown;
    columns: unknown;
    cellColoring: unknown;
    columnStyle: unknown;
    groupBy: unknown;
    aggregate: unknown;
    filter: OutputFilterProperty;
    lockedFilter: unknown;
    searchFields: unknown;
    sort: unknown;
    pageSize: number;
    denstity: string;
    customLabels: unknown;
    customIcon: string;
    frozenColumns: number;
    showColumnBorder: boolean;
    showRecordDetails: boolean;
    enableSplitView: boolean;
    related: OutputRelatedComponent[];
    actions: unknown;
    pagination: string;
    interactiveFilters: string;
    gridExplorer: string;
    enableExport: string;
    enalbleImport: string;
    enableUserFilter: string;
    enableFilterLink: string;
    enableAutoFill: string;
    hiddenColumns: unknown;
    defaultValues: unknown;
    hiddenFields: unknown;
    fullRecordCreation: boolean;
    buttonActions: boolean;
    recordActions: unknown;
    massClone: string;
    massUpdate: string;
    massDelete: string;
    modalCreate: string;
    modalUpdate: string;
    inlineCreate: string;
    inlineUpdate: string;
    collapseGroups: boolean;
    multiLevelGrouping: boolean;
  };
};

export type OutputOwnerProperty = {
  Id: string;
  username: string;
};

export type OutputFilterProperty = {
  type: string;
  value: unknown;
};

export type OutputRelatedComponent = {
  type: string;
  label: string;
  name: string;
  component: string;
  attributes: unknown;
};

export type UserGridAttributes = {
  userGridId: string;
  userGridApiName: string;
  adminFilter: string;
  density: string;
};

export default class UserGridExport extends SfCommand<boolean> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.targetOrg.summary'),
      required: true,
    }),

    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
      required: false,
    }),

    query: Flags.string({
      summary: messages.getMessage('flags.query.summary'),
      char: 'q',
      required: false,
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
  private userGridCache: Record[] = [];

  public async run(): Promise<boolean> {
    const { flags } = await this.parse(UserGridExport);

    if (!flags.name && !flags.query) {
      this.error('Missing query or api name)');
    }

    this.connection = flags['target-org'].getConnection(flags['api-version']);
    await this.buildCache();

    let records: Record[] = [];

    if (flags.name) {
      const whereCondition = `gmpkg__Developer_Name__c in ('${flags.name.split(',').join("','")}')`;
      const soqlQuery = `SELECT Id, Name, \
      gmpkg__Developer_Name__c, \
      gmpkg__Object_Name__c, \
      gmpkg__Comment__c, \
      gmpkg__Columns__c, \
      gmpkg__Formulas__c, \
      gmpkg__Cell_Coloring__c, \
      gmpkg__Column_Style__c, \
      gmpkg__GroupBy__c, \
      gmpkg__Aggregate__c, \
      gmpkg__Actions__c, \
      gmpkg__Compact_Density__c, \
      gmpkg__FilterType__c, \
      gmpkg__Filter__c, \
      gmpkg__QuickFilters__c, \
      gmpkg__Admin_Filter__c, \
      gmpkg__Search_Fields__c, \
      gmpkg__Sort__c, \
      gmpkg__Record_Related__c, \
      gmpkg__Custom_Icon__c, \
      gmpkg__Frozen_Columns__c, \
      gmpkg__Show_Column_Border__c, \
      gmpkg__Show_Record_Details__c, \
      gmpkg__Split_View__c, \
      gmpkg__PageSize__c, \
      gmpkg__Custom_Label__c, \
      gmpkg__Pagination__c, \
      gmpkg__InteractiveFilters__c, \
      gmpkg__GridExplorer__c, \
      gmpkg__Export__c, \
      gmpkg__Import__c, \
      gmpkg__EndUser_Filter__c, \
      gmpkg__Filter_Link__c, \
      gmpkg__AutoFill__c, \
      gmpkg__Hidden_Columns__c, \
      gmpkg__Default_Values__c, \
      gmpkg__Hidden_Fields__c, \
      gmpkg__FullRecord_Creation__c, \
      gmpkg__Actions_As_Buttons__c, \
      gmpkg__Record_Actions__c, \
      gmpkg__MassClone__c, \
      gmpkg__MassUpdate__c, \
      gmpkg__MassDelete__c, \
      gmpkg__ModalCreate__c, \
      gmpkg__ModalUpdate__c, \
      gmpkg__InlineCreate__c, \
      gmpkg__InlineUpdate__c, \
      gmpkg__Collapse_Groups__c, \
      gmpkg__MultiLevel_Grouping__c, \
      OwnerId, \
      Owner.Username, \
      CreatedDate, \
      CreatedById, \
      LastModifiedDate, \
      LastModifiedById \
      FROM gmpkg__xUser_Grid__c WHERE ${whereCondition}`;
      records = (await this.connection.query(soqlQuery)).records;
    }

    if (flags.query) {
      const chunkSize = 50;
      const candidateRecords = (await this.connection.query(flags.query)).records;

      for (let i = 0; i < candidateRecords.length; i += chunkSize) {
        const chunk = candidateRecords.slice(i, i + chunkSize);
        const whereCondition = `Id in ('${chunk.map((rec) => rec.Id).join("','")}')`;
        const soqlQuery = `SELECT Id, Name, \
        gmpkg__Developer_Name__c, \
        gmpkg__Object_Name__c, \
        gmpkg__Comment__c, \
        gmpkg__Columns__c, \
        gmpkg__Formulas__c, \
        gmpkg__Cell_Coloring__c, \
        gmpkg__Column_Style__c, \
        gmpkg__GroupBy__c, \
        gmpkg__Aggregate__c, \
        gmpkg__Actions__c, \
        gmpkg__Compact_Density__c, \
        gmpkg__FilterType__c, \
        gmpkg__Filter__c, \
        gmpkg__QuickFilters__c, \
        gmpkg__Admin_Filter__c, \
        gmpkg__Search_Fields__c, \
        gmpkg__Sort__c, \
        gmpkg__Record_Related__c, \
        gmpkg__Custom_Icon__c, \
        gmpkg__Frozen_Columns__c, \
        gmpkg__Show_Column_Border__c, \
        gmpkg__Show_Record_Details__c, \
        gmpkg__Split_View__c, \
        gmpkg__PageSize__c, \
        gmpkg__Custom_Label__c, \
        gmpkg__Pagination__c, \
        gmpkg__InteractiveFilters__c, \
        gmpkg__GridExplorer__c, \
        gmpkg__Export__c, \
        gmpkg__Import__c, \
        gmpkg__EndUser_Filter__c, \
        gmpkg__Filter_Link__c, \
        gmpkg__AutoFill__c, \
        gmpkg__Hidden_Columns__c, \
        gmpkg__Default_Values__c, \
        gmpkg__Hidden_Fields__c, \
        gmpkg__FullRecord_Creation__c, \
        gmpkg__Actions_As_Buttons__c, \
        gmpkg__Record_Actions__c, \
        gmpkg__MassClone__c, \
        gmpkg__MassUpdate__c, \
        gmpkg__MassDelete__c, \
        gmpkg__ModalCreate__c, \
        gmpkg__ModalUpdate__c, \
        gmpkg__InlineCreate__c, \
        gmpkg__InlineUpdate__c, \
        gmpkg__Collapse_Groups__c, \
        gmpkg__MultiLevel_Grouping__c, \
        OwnerId, \
        Owner.Username, \
        CreatedDate, \
        CreatedById, \
        LastModifiedDate, \
        LastModifiedById \
        FROM gmpkg__xUser_Grid__c WHERE ${whereCondition}`;

        const chunkRecords = (await this.connection.query(soqlQuery)).records;
        records = records.concat(chunkRecords);
      }
    }

    this.progress.start(0, {}, { title: 'Export progress' });
    this.progress.setTotal(records.length);

    records.forEach((inputRec, index) => {
      const outputRec: OutputRecord = {
        fullName: String(inputRec.gmpkg__Developer_Name__c),
        metadata: {
          Id: String(inputRec.Id),
          fullName: inputRec.gmpkg__Developer_Name__c,
          label: inputRec.Name,
          objectApiName: inputRec.gmpkg__Object_Name__c,
          description: inputRec.gmpkg__Comment__c,
          createdDate: inputRec.CreatedDate,
          createdById: inputRec.CreatedById,
          lastModifiedDate: inputRec.LastModifiedDate,
          lastModifiedById: inputRec.LastModifiedById,
          owner: this.buildOwner(inputRec),
          formulas: this.buildFormulas(inputRec),
          columns: this.buildColumns(inputRec),
          cellColoring: this.buildCellColoring(inputRec),
          columnStyle: this.buildColumnStyle(inputRec),
          groupBy: this.buildGroupBy(inputRec),
          aggregate: this.buildAggregate(inputRec),
          filter: this.buildFilter(inputRec),
          lockedFilter: this.buildLockedFilter(inputRec),
          searchFields: this.buildSearchFields(inputRec),
          sort: this.buildSort(inputRec),
          pageSize: inputRec.gmpkg__PageSize__c,
          denstity: this.buildDensity(inputRec),
          customLabels: this.buildCustomLabels(inputRec),
          customIcon: inputRec.gmpkg__Custom_Icon__c,
          frozenColumns: inputRec.gmpkg__Frozen_Columns__c,
          showColumnBorder: inputRec.gmpkg__Show_Column_Border__c,
          showRecordDetails: inputRec.gmpkg__Show_Record_Details__c,
          enableSplitView: inputRec.gmpkg__Split_View__c,
          pagination: inputRec.gmpkg__Pagination__c,
          interactiveFilters: inputRec.gmpkg__InteractiveFilters__c,
          gridExplorer: inputRec.gmpkg__GridExplorer__c,
          related: this.buildRelated(inputRec),
          actions: this.buildActions(inputRec),
          enableExport: inputRec.gmpkg__Export__c,
          enalbleImport: inputRec.gmpkg__Import__c,
          enableUserFilter: inputRec.gmpkg__EndUser_Filter__c,
          enableFilterLink: inputRec.gmpkg__Filter_Link__c,
          enableAutoFill: inputRec.gmpkg__AutoFill__c,
          hiddenColumns: this.buildHiddenColumns(inputRec),
          defaultValues: this.buildDefaultValues(inputRec),
          hiddenFields: this.buildHiddenFields(inputRec),
          fullRecordCreation: inputRec.gmpkg__FullRecord_Creation__c,
          buttonActions: inputRec.gmpkg__Actions_As_Buttons__c,
          recordActions: this.buildRecordActions(inputRec),
          massClone: inputRec.gmpkg__MassClone__c,
          massUpdate: inputRec.gmpkg__MassUpdate__c,
          massDelete: inputRec.gmpkg__MassDelete__c,
          modalCreate: inputRec.gmpkg__ModalCreate__c,
          modalUpdate: inputRec.gmpkg__ModalUpdate__c,
          inlineCreate: inputRec.gmpkg__InlineCreate__c,
          inlineUpdate: inputRec.gmpkg__InlineUpdate__c,
          collapseGroups: inputRec.gmpkg__Collapse_Groups__c,
          multiLevelGrouping: inputRec.gmpkg__MultiLevel_Grouping__c,
        },
      };

      this.saveRecord(outputRec, flags.directory);
      this.progress.update(index);
    });

    this.progress.finish();
    return true;
  }

  private buildOwner(inputRec: Record): OutputOwnerProperty {
    return {
      Id: String(inputRec.OwnerId),
      username: String(inputRec.Owner.Username),
    };
  }

  private buildColumns(inputRec: Record): unknown {
    if (inputRec.gmpkg__Columns__c) {
      return JSON.parse(String(inputRec.gmpkg__Columns__c));
    }
  }

  private buildFormulas(inputRec: Record): unknown {
    if (inputRec.gmpkg__Formulas__c) {
      return JSON.parse(String(inputRec.gmpkg__Formulas__c));
    }
  }

  private buildCellColoring(inputRec: Record): unknown {
    if (inputRec.gmpkg__Cell_Coloring__c) {
      return JSON.parse(String(inputRec.gmpkg__Cell_Coloring__c));
    }
  }

  private buildColumnStyle(inputRec: Record): unknown {
    if (inputRec.gmpkg__Column_Style__c) {
      return JSON.parse(String(inputRec.gmpkg__Column_Style__c));
    }
  }

  private buildGroupBy(inputRec: Record): unknown {
    if (inputRec.gmpkg__GroupBy__c) {
      return String(inputRec.gmpkg__GroupBy__c)
        .split(',')
        .map((x) => x.trim());
    }
  }

  private buildAggregate(inputRec: Record): unknown {
    if (inputRec.gmpkg__Aggregate__c) {
      return JSON.parse(String(inputRec.gmpkg__Aggregate__c));
    }
  }

  private buildActions(inputRec: Record): unknown {
    if (inputRec.gmpkg__Actions__c) {
      return JSON.parse(String(inputRec.gmpkg__Actions__c));
    }
  }

  private buildRecordActions(inputRec: Record): unknown {
    if (inputRec.gmpkg__Record_Actions__c) {
      return JSON.parse(String(inputRec.gmpkg__Record_Actions__c));
    }
  }

  private buildDensity(inputRec: Record): string {
    return inputRec.gmpkg__Compact_Density__c ? 'compact' : 'comfy';
  }

  private buildFilter(inputRec: Record): OutputFilterProperty {
    if (inputRec.gmpkg__FilterType__c === 'Quick') {
      return {
        type: String(inputRec.gmpkg__FilterType__c),
        value: JSON.parse(String(inputRec.gmpkg__QuickFilters__c ?? '[]')),
      };
    }

    return {
      type: String(inputRec.gmpkg__FilterType__c),
      value: JSON.parse(String(inputRec.gmpkg__Filter__c ?? '{}')),
    };
  }

  private buildLockedFilter(inputRec: Record): unknown {
    if (inputRec.gmpkg__Admin_Filter__c) {
      return JSON.parse(String(inputRec.gmpkg__Admin_Filter__c));
    }
  }

  private buildSearchFields(inputRec: Record): unknown {
    if (inputRec.gmpkg__Search_Fields__c) {
      return String(inputRec.gmpkg__Search_Fields__c)
        .split(',')
        .map((x) => x.trim());
    }
  }

  private buildSort(inputRec: Record): unknown {
    if (inputRec.gmpkg__Sort__c) {
      return String(inputRec.gmpkg__Sort__c)
        .split(',')
        .map((str) => {
          const strList = str.trim().split(' ');

          return {
            fieldApiName: strList[0].trim(),
            order: strList[1].trim(),
          };
        });
    }
  }

  private buildRelated(inputRec: Record): OutputRelatedComponent[] {
    if (inputRec.gmpkg__Record_Related__c) {
      const relatedList = JSON.parse(String(inputRec.gmpkg__Record_Related__c));

      return relatedList.map((cmp: OutputRelatedComponent) => {
        if (cmp.type === 'GM - User Grid') {
          const attributes = cmp.attributes as UserGridAttributes;

          if (attributes?.userGridId) {
            attributes.userGridApiName = this.getUserGridApiName(attributes.userGridId);
          }
        }

        return cmp;
      });
    }

    return [];
  }

  private buildCustomLabels(inputRec: Record): unknown {
    if (inputRec.gmpkg__Custom_Label__c) {
      return JSON.parse(String(inputRec.gmpkg__Custom_Label__c));
    }
  }

  private buildHiddenColumns(inputRec: Record): unknown {
    if (inputRec.gmpkg__Hidden_Columns__c) {
      return String(inputRec.gmpkg__Hidden_Columns__c)
        .split(',')
        .map((x) => x.trim());
    }

    return null;
  }

  private buildDefaultValues(inputRec: Record): unknown {
    if (inputRec.gmpkg__Default_Values__c) {
      return JSON.parse(String(inputRec.gmpkg__Default_Values__c));
    }

    return null;
  }

  private buildHiddenFields(inputRec: Record): unknown {
    if (inputRec.gmpkg__Hidden_Fields__c) {
      return String(inputRec.gmpkg__Hidden_Fields__c)
        .split(',')
        .map((x) => x.trim());
    }

    return null;
  }

  private saveRecord(outputRec: OutputRecord, directory: string): boolean {
    const filePath = path.join(directory, String(outputRec.fullName));

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(`${filePath}.json`, JSON.stringify(outputRec.metadata, null, 2));

    return true;
  }

  private getUserGridApiName(recordId: string): string {
    if (this.userGridCache) {
      const userGrid = this.userGridCache.find((x) => x.Id === recordId);

      if (userGrid?.gmpkg__Developer_Name__c) {
        return userGrid.gmpkg__Developer_Name__c;
      }
    }
  }

  private async buildCache(): Promise<boolean> {
    if (this.connection) {
      this.userGridCache = (
        await this.connection.query('SELECT Id, gmpkg__Developer_Name__c FROM gmpkg__xUser_Grid__c')
      ).records;
    }

    return true;
  }
}
