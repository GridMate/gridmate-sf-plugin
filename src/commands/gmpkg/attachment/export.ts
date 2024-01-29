/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { mkdirSync, createWriteStream } from 'fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { Record } from 'jsforce';
import fetch from 'node-fetch';

const streamPipeline = promisify(pipeline);

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('gmpkg', 'gmpkg.attachment.export');

export default class AttachmentExport extends SfCommand<boolean> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.targetOrg.summary'),
      required: true,
    }),

    'api-version': Flags.orgApiVersion({
      summary: messages.getMessage('flags.orgApiVersion.summary'),
      required: true,
    }),

    query: Flags.string({
      summary: messages.getMessage('flags.query.summary'),
      char: 'q',
      required: true,
    }),

    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
      required: true,
    }),

    directory: Flags.string({
      summary: messages.getMessage('flags.directory.summary'),
      char: 'd',
      required: true,
    }),
  };

  public async run(): Promise<boolean> {
    const { flags } = await this.parse(AttachmentExport);

    if (!flags.query && !flags.report) {
      this.error('Missing query or report)');
    }

    const connection = flags['target-org'].getConnection(flags['api-version']);
    const records: Record[] = (await connection.query(flags.query)).records;

    // Get the list of the records from a report

    let counter = 0;
    this.progress.start(counter, {});
    this.progress.setTotal(records.length);

    const chunks = this.arrayToChunks(records, 50);
    for (const chunck of chunks) {
      const idList = chunck.map((x) => x.Id);

      const attachments = (
        await connection.query(
          `Select Id, ContentDocumentId, LinkedEntityId, 
        ContentDocument.Title, 
        ContentDocument.FileExtension, 
        ContentDocument.LatestPublishedVersionId 
        From ContentDocumentLink Where LinkedEntityId in ('${idList.join("','")}')`
        )
      ).records;

      for (const record of chunck) {
        const recAttachments = attachments.filter((x: Record) => x.LinkedEntityId === record.Id);

        if (recAttachments.length > 0) {
          const recordName = String(record[flags.name]);
          const recordDir = `${flags.directory}/${recordName}`;
          mkdirSync(recordDir, { recursive: true });

          for (const attachment of recAttachments) {
            const filename = `${String(attachment.ContentDocument.Title)}.${String(
              attachment.ContentDocument.FileExtension
            )}`;

            const dataPath = `/services/data/v59.0/sobjects/ContentVersion/${String(
              attachment.ContentDocument.LatestPublishedVersionId
            )}/VersionData`;

            const headers = {
              Authorization: 'Bearer ' + String(connection.accessToken),
              'Content-Type': 'blob',
            };

            const res = await fetch(`${String(connection.instanceUrl)}${dataPath}`, {
              method: 'GET',
              headers,
            });

            await streamPipeline(res.body, createWriteStream(`${recordDir}/${filename}`));
          }
        }
      }

      counter += chunck.length;
      this.progress.update(counter);
    }

    this.progress.finish();
    return true;
  }

  private arrayToChunks(arr: Record[], chunkSize: number): Record[][] {
    const res: Record[][] = [];

    for (let i = 0; i < arr.length; i += chunkSize) {
      res.push(arr.slice(i, i + chunkSize));
    }

    return res;
  }
}
