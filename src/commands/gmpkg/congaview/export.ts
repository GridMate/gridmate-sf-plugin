/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
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
const messages = Messages.loadMessages('gmpkg', 'gmpkg.congaview.export');

export type OutputRecord = {
  fullName: string;
  metadata: {
    CRMC_PP__Context__c: string;
    CRMC_PP__Description__c: string;
    CRMC_PP__IsDefault__c: string;
    CRMC_PP__JSON__c: unknown;
    CRMC_PP__ObjectName__c: string;
    CRMC_PP__Privacy__c: string;
    Id: string;
    Name: string;
  };
};

export default class CongaViewExport extends SfCommand<boolean> {
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

  public async run(): Promise<boolean> {
    const { flags } = await this.parse(CongaViewExport);

    if (!flags.name && !flags.query) {
      this.error('Missing query or api name)');
    }

    this.connection = flags['target-org'].getConnection(flags['api-version']);

    let records: Record[] = [];

    if (flags.name) {
      const whereCondition = `Name in ('${flags.name.split(',').join("','")}')`;
      const soqlQuery = `SELECT CRMC_PP__Context__c, \
      CRMC_PP__IsDefault__c, \
      CRMC_PP__JSON__c, \
      CRMC_PP__ObjectName__c, \
      CRMC_PP__Privacy__c, \
      Id, \
      Name \
      FROM CRMC_PP__GridView__c WHERE ${whereCondition}`;
      records = (await this.connection.query(soqlQuery)).records;
    }

    if (flags.query) {
      const chunkSize = 50;
      const candidateRecords = (await this.connection.query(flags.query)).records;

      for (let i = 0; i < candidateRecords.length; i += chunkSize) {
        const chunk = candidateRecords.slice(i, i + chunkSize);
        const whereCondition = `Id in ('${chunk.map((rec) => rec.Id).join("','")}')`;
        const soqlQuery = `SELECT CRMC_PP__Context__c, \
        CRMC_PP__IsDefault__c, \
        CRMC_PP__JSON__c, \
        CRMC_PP__ObjectName__c, \
        CRMC_PP__Privacy__c, \
        Id, \
        Name \
        FROM CRMC_PP__GridView__c WHERE ${whereCondition}`;

        const chunkRecords = (await this.connection.query(soqlQuery)).records;
        records = records.concat(chunkRecords);
      }
    }

    this.progress.start(0, {}, { title: 'Export progress' });
    this.progress.setTotal(records.length);

    records.forEach((inputRec, index) => {
      const outputRec: OutputRecord = {
        fullName: String(inputRec.Name).replaceAll('/', '_'),
        metadata: {
          CRMC_PP__Context__c: inputRec.CRMC_PP__Context__c,
          CRMC_PP__Description__c: inputRec.CRMC_PP__Description__c,
          CRMC_PP__IsDefault__c: inputRec.CRMC_PP__IsDefault__c,
          CRMC_PP__JSON__c: JSON.parse(String(inputRec.CRMC_PP__JSON__c)),
          CRMC_PP__ObjectName__c: inputRec.CRMC_PP__ObjectName__c,
          CRMC_PP__Privacy__c: inputRec.CRMC_PP__Privacy__c,
          Id: String(inputRec.Id),
          Name: inputRec.Name,
        },
      };

      this.saveRecord(outputRec, flags.directory);
      this.progress.update(index);
    });

    this.progress.finish();
    return true;
  }

  private saveRecord(outputRec: OutputRecord, directory: string): boolean {
    const filePath = path.join(directory, `${outputRec.metadata.CRMC_PP__ObjectName__c}/`, String(outputRec.fullName));

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(`${filePath}.json`, JSON.stringify(outputRec.metadata, null, 2));

    return true;
  }
}
