# summary

Export Conga View

# description

You can export either from a list of api names or an SOQL query.

# flags.targetOrg.summary

Target org username/alias

# flags.name.summary

',' List of Conga Views.

# flags.query.summary

SOQL query to fetch list of Conga Views.

# flags.directory.summary

Export output directory.

# flags.orgApiVersion.summary

Salesforce API Version

# examples

- <%= config.bin %> <%= command.id %> -o gmpkg-demo --api-version=58.0 -d "/data/conga/export" -n "Opportunity_All_View"
- <%= config.bin %> <%= command.id %> -o gmpkg-demo --api-version=58.0 -d "/data/conga/export" -q "SELECT Id, Name FROM CRMC_PP_GridView_c Where CRMC_PP_ObjectName_c='Opportunity'"
