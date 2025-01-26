# summary

Import GM - User Grid

# description

You can import either a file or a directory.

# flags.targetOrg.summary

Target org username/alias

# flags.file.summary

file path to import

# flags.directory.summary

directory path to import.

# flags.owner.summary

default grid owner

# flags.orgApiVersion.summary

Salesforce API Version

# examples

- <%= config.bin %> <%= command.id %> -o gmpkg-demo --api-version=58.0 -d "/data/Opportunity/import"
- <%= config.bin %> <%= command.id %> -o gmpkg-demo --api-version=58.0 -f "/data/Opportunity/import" -u username
- <%= config.bin %> <%= command.id %> -o gmpkg-demo --api-version=58.0 -f "/data/Opportunity/import/Opportunity_All_Grid.json"
