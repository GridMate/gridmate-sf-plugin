/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { Record } from 'jsforce';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('gmpkg', 'gmpkg.attachment.delete');

export default class AttachmentDelete extends SfCommand<boolean> {
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
  };

  public async run(): Promise<boolean> {
    const { flags } = await this.parse(AttachmentDelete);
    const connection = flags['target-org'].getConnection(flags['api-version']);
    const records: Record[] = (await connection.query(flags.query)).records;

    let counter = 0;
    this.progress.start(counter, {});
    this.progress.setTotal(records.length);

    const chunks = this.arrayToChunks(records, 50);
    for (const chunck of chunks) {
      // Get the list of documents
      const documentIdList = Array.from(
        new Set(
          (
            await connection.query(
              `Select Id, 
              ContentDocumentId, 
              LinkedEntityId, 
              ContentDocument.Title, 
              ContentDocument.FileExtension, 
              ContentDocument.LatestPublishedVersionId 
              From ContentDocumentLink 
              Where LinkedEntityId in ('${chunck.map((x) => x.Id).join("','")}')`
            )
          ).records.map((x) => String(x.ContentDocumentId))
        )
      );

      // Delete them
      await connection
        .query(
          `Select Id From ContentDocument 
          Where Id in ('${documentIdList.join("','")}')`
        )
        .destroy('ContentDocument');

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
