/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable  @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable  class-methods-use-this */

import * as path from 'path';
import * as fs from 'fs';

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Connection, Messages } from '@salesforce/core';
import { Record } from 'jsforce';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('gmpkg', 'gmpkg.usergrid.import');

export type OutputOwnerProperty = {
  attributes: {
    type: string;
  };

  Username: string;
};

export type InputOwnerProperty = {
  Id: string;
  username: string;
};

export type InputFilterProperty = {
  type: string;
  value: unknown;
};

export type InputRelatedComponent = {
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

export type InputRecord = {
  Id: string;
  fullName: string;
  label: string;
  objectApiName: string;
  description: string;
  createdDate: string;
  createdById: string;
  lastModifiedDate: string;
  lastModifiedById: string;
  owner: InputOwnerProperty;
  formulas: unknown;
  columns: string[];
  cellColoring: unknown;
  columnStyle: unknown;
  groupBy: string[];
  aggregate: unknown;
  filter: InputFilterProperty;
  lockedFilter: unknown;
  searchFields: string[];
  sort: Array<{
    fieldApiName: string;
    order: string;
  }>;
  pageSize: number;
  denstity: string;
  customLabels: unknown;
  customIcon: string;
  frozenColumns: number;
  showColumnBorder: boolean;
  showRecordDetails: boolean;
  enableSplitView: boolean;
  related: InputRelatedComponent[];
  actions: unknown;
  pagination: string;
  interactiveFilters: string;
  gridExplorer: string;
  enableExport: string;
  enalbleImport: string;
  enableFilterLink: string;
  enableAutoFill: string;
  hiddenColumns: string[];
  defaultValues: unknown;
  hiddenFields: string[];
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

export type OutputRelatedComponent = {
  key: string;
  type: string;
  label: string;
  props: string;
  component: string;
  attributes: {
    userGridId: string;
    adminFilter: string;
    density: string;
  };
};

export default class UserGridImport extends SfCommand<boolean> {
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
      required: false,
    }),

    directory: Flags.string({
      summary: messages.getMessage('flags.directory.summary'),
      char: 'd',
      required: false,
    }),

    owner: Flags.string({
      summary: messages.getMessage('flags.owner.summary'),
      char: 'u',
      required: false,
    }),

    'api-version': Flags.orgApiVersion({
      summary: messages.getMessage('flags.orgApiVersion.summary'),
      required: true,
    }),
  };

  private connection: Connection | undefined;
  private userGridCache: Record[] = [];

  public async run(): Promise<boolean> {
    const { flags } = await this.parse(UserGridImport);

    if (!flags.file && !flags.directory) {
      this.error('Missing file or directory)');
    }

    this.connection = flags['target-org'].getConnection(flags['api-version']);
    await this.buildCache();

    const fileList: string[] = [];

    if (flags.file) {
      fileList.push(flags.file);
    }

    if (flags.directory) {
      const getFiles = (dir: string): void => {
        fs.readdirSync(dir).forEach((file) => {
          const filePath = path.join(String(dir), file);
          const fileStat = fs.statSync(filePath);

          if (fileStat.isDirectory()) {
            getFiles(filePath);
          } else if (!fileList.includes(filePath) && filePath.endsWith('.json')) {
            fileList.push(filePath);
          }
        });
      };

      getFiles(flags.directory);
    }

    this.progress.start(0, {}, { title: 'Import progress' });
    this.progress.setTotal(fileList.length);

    let index = 0;
    for (const file of fileList) {
      const inputRec: InputRecord = JSON.parse(String(fs.readFileSync(file)));
      this.info(` --> Importing ${String(inputRec.fullName)}`);

      const outputRec: Record = {
        Id: this.getUserGridId(inputRec.fullName),
        Name: inputRec.label,
        Owner: this.buildOwner(inputRec, flags.owner),
        gmpkg__Developer_Name__c: inputRec.fullName,
        gmpkg__Object_Name__c: inputRec.objectApiName,
        gmpkg__Comment__c: inputRec.description,
        gmpkg__Formulas__c: this.buildFormulas(inputRec),
        gmpkg__Columns__c: this.buildColumns(inputRec),
        gmpkg__Cell_Coloring__c: this.buildCellColoring(inputRec),
        gmpkg__Column_Style__c: this.buildColumnStyle(inputRec),
        gmpkg__GroupBy__c: this.buildGroupBy(inputRec),
        gmpkg__Aggregate__c: this.buildAggregate(inputRec),
        gmpkg__FilterType__c: this.buildFilterType(inputRec),
        gmpkg__QuickFilters__c: this.buildQuickFilters(inputRec),
        gmpkg__Filter__c: this.buildAdvancedFilter(inputRec),
        gmpkg__Admin_Filter__c: this.buildLockedFilter(inputRec),
        gmpkg__Search_Fields__c: this.buildSearchFields(inputRec),
        gmpkg__Sort__c: this.buildSort(inputRec),
        gmpkg__PageSize__c: inputRec.pageSize,
        gmpkg__Compact_Density__c: this.buildDensity(inputRec),
        gmpkg__Custom_Label__c: this.buildCustomLabels(inputRec),
        gmpkg__Custom_Icon__c: inputRec.customIcon,
        gmpkg__Frozen_Columns__c: inputRec.frozenColumns,
        gmpkg__Show_Column_Border__c: inputRec.showColumnBorder,
        gmpkg__Show_Record_Details__c: inputRec.showRecordDetails,
        gmpkg__Split_View__c: inputRec.enableSplitView,
        gmpkg__Pagination__c: inputRec.pagination,
        gmpkg__InteractiveFilters__c: inputRec.interactiveFilters,
        gmpkg__GridExplorer__c: inputRec.gridExplorer,
        gmpkg__Record_Related__c: this.buildRelated(inputRec),
        gmpkg__Actions__c: this.buildActions(inputRec),
        gmpkg__Export__c: inputRec.enableExport,
        gmpkg__Import__c: inputRec.enalbleImport,
        gmpkg__Filter_Link__c: inputRec.enableFilterLink,
        gmpkg__AutoFill__c: inputRec.enableAutoFill,
        gmpkg__Hidden_Columns__c: this.buildHiddenColumns(inputRec),
        gmpkg__Default_Values__c: this.buildDefaultValues(inputRec),
        gmpkg__Hidden_Fields__c: this.buildHiddenFields(inputRec),
        gmpkg__FullRecord_Creation__c: inputRec.fullRecordCreation,
        gmpkg__Actions_As_Buttons__c: inputRec.buttonActions,
        gmpkg__Record_Actions__c: this.buildRecordActions(inputRec),
        gmpkg__MassClone__c: inputRec.massClone,
        gmpkg__MassUpdate__c: inputRec.massUpdate,
        gmpkg__MassDelete__c: inputRec.massDelete,
        gmpkg__ModalCreate__c: inputRec.modalCreate,
        gmpkg__ModalUpdate__c: inputRec.modalUpdate,
        gmpkg__InlineCreate__c: inputRec.inlineCreate,
        gmpkg__InlineUpdate__c: inputRec.inlineUpdate,
        gmpkg__Collapse_Groups__c: inputRec.collapseGroups,
        gmpkg__MultiLevel_Grouping__c: inputRec.multiLevelGrouping,
      };

      this.progress.update(index++);

      if (!(await this.saveRecord(outputRec))) {
        this.error(`Unable to import ${file}`);
      }
    }

    this.progress.finish();
    return true;
  }

  private buildOwner(inputRec: InputRecord, owner: string): OutputOwnerProperty {
    return {
      attributes: {
        type: 'User',
      },
      Username: owner || String(inputRec.owner.username),
    };
  }

  private buildColumns(inputRec: InputRecord): unknown {
    if (inputRec.columns) {
      return JSON.stringify(inputRec.columns);
    }
  }

  private buildFormulas(inputRec: InputRecord): unknown {
    if (inputRec.formulas) {
      return JSON.stringify(inputRec.formulas);
    }

    return '[]';
  }

  private buildCellColoring(inputRec: InputRecord): unknown {
    if (inputRec.cellColoring) {
      return JSON.stringify(inputRec.cellColoring);
    }

    return '{}';
  }

  private buildColumnStyle(inputRec: InputRecord): unknown {
    if (inputRec.columnStyle) {
      return JSON.stringify(inputRec.columnStyle);
    }

    return '{}';
  }

  private buildGroupBy(inputRec: InputRecord): unknown {
    if (inputRec.groupBy && inputRec.groupBy.length > 0) {
      return inputRec.groupBy.join(',');
    }

    return '';
  }

  private buildAggregate(inputRec: InputRecord): unknown {
    if (inputRec.aggregate) {
      return JSON.stringify(inputRec.aggregate);
    }

    return '{}';
  }

  private buildActions(inputRec: InputRecord): unknown {
    if (inputRec.actions) {
      return JSON.stringify(inputRec.actions);
    }

    return '[]';
  }

  private buildRecordActions(inputRec: InputRecord): unknown {
    if (inputRec.recordActions) {
      return JSON.stringify(inputRec.recordActions);
    }

    return '[]';
  }

  private buildDensity(inputRec: InputRecord): boolean {
    return inputRec.denstity === 'compact';
  }

  private buildFilterType(inputRec: InputRecord): string {
    return inputRec.filter.type;
  }

  private buildQuickFilters(inputRec: InputRecord): unknown {
    if (inputRec.filter.type === 'Quick' && inputRec.filter.value) {
      return JSON.stringify(inputRec.filter.value);
    }

    return '[]';
  }

  private buildAdvancedFilter(inputRec: InputRecord): unknown {
    if (inputRec.filter.type !== 'Quick' && inputRec.filter.value) {
      return JSON.stringify(inputRec.filter.value);
    }

    return '{"and" : []}';
  }

  private buildLockedFilter(inputRec: InputRecord): unknown {
    if (inputRec.lockedFilter) {
      return JSON.stringify(inputRec.lockedFilter);
    }
  }

  private buildSearchFields(inputRec: InputRecord): unknown {
    if (inputRec.searchFields && inputRec.searchFields.length > 0) {
      return inputRec.searchFields.join(',');
    }

    return '';
  }

  private buildSort(inputRec: InputRecord): unknown {
    if (inputRec.sort && inputRec.sort.length > 0) {
      return inputRec.sort
        .map((s) => `${s.fieldApiName} ${s.order} nulls ${s.order === 'asc' ? 'first' : 'last'}`)
        .join(',');
    }

    return '';
  }

  private buildRelated(inputRec: InputRecord): unknown {
    if (inputRec.related && inputRec.related.length > 0) {
      return JSON.stringify(
        inputRec.related.map((cmp: InputRelatedComponent) => {
          if (cmp.type === 'GM - User Grid') {
            const attributes = cmp.attributes as UserGridAttributes;
            if (attributes?.userGridApiName) {
              attributes.userGridId = this.getUserGridId(attributes.userGridApiName);
              delete attributes.userGridApiName;
            }
          }

          return cmp;
        })
      );
    }

    return '[]';
  }

  private buildCustomLabels(inputRec: InputRecord): unknown {
    if (inputRec.customLabels) {
      return JSON.stringify(inputRec.customLabels);
    }
  }

  private buildHiddenColumns(inputRec: InputRecord): unknown {
    if (inputRec.hiddenColumns && inputRec.hiddenColumns.length > 0) {
      return inputRec.hiddenColumns.join(',');
    }

    return '';
  }

  private buildDefaultValues(inputRec: InputRecord): unknown {
    if (inputRec.defaultValues) {
      return JSON.stringify(inputRec.defaultValues);
    }

    return null;
  }

  private buildHiddenFields(inputRec: InputRecord): unknown {
    if (inputRec.hiddenFields && inputRec.hiddenFields.length > 0) {
      return inputRec.hiddenFields.join(',');
    }

    return '';
  }

  private async saveRecord(outputRec: Record): Promise<boolean> {
    try {
      if (this.connection) {
        if (!outputRec.Id) {
          await this.connection.insert('gmpkg__xUser_Grid__c', outputRec);
        } else {
          await this.connection.update('gmpkg__xUser_Grid__c', outputRec);
        }
      }
      return true;
    } catch (err) {
      this.error(String(err));
    }
  }

  private getUserGridLabel(userGridApiName: string): unknown {
    if (this.userGridCache) {
      const userGrid = this.userGridCache.find((x) => x.gmpkg__Developer_Name__c === userGridApiName);

      if (userGrid?.Name) {
        return userGrid.Name;
      }
    }
  }

  private getUserGridId(userGridApiName: string): string {
    if (this.userGridCache) {
      const userGrid = this.userGridCache.find((x) => x.gmpkg__Developer_Name__c === userGridApiName);

      if (userGrid?.Id) {
        return userGrid.Id;
      }
    }

    return '';
  }

  private async buildCache(): Promise<boolean> {
    if (this.connection) {
      this.userGridCache = (
        await this.connection.query('SELECT Id, Name, gmpkg__Developer_Name__c FROM gmpkg__xUser_Grid__c')
      ).records;
    }

    return true;
  }
}
