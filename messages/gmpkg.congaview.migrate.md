# summary

Import Conga View

# description

Import a Conga View Json file

# flags.targetOrg.summary

Target org username/alias

# flags.file.summary

file path to migrate.

# flags.directory.summary

target directory.

# flags.orgApiVersion.summary

Salesforce API Version

# examples

- <%= config.bin %> <%= command.id %> -o gmpkg-demo --api-version=58.0 -f "/data/conga/export/Opportunity_All_View.json" -d "/data/conga/migrated"
