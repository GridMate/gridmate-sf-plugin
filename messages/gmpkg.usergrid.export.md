# summary

Export GM - User Grid

# description

You can export either from a list of api names or an SOQL query.

# flags.targetOrg.summary

Target org username/alias

# flags.name.summary

',' List of API names of GM - User Grids.

# flags.query.summary

SOQL query to fetch list of GM - User Grids.

# flags.directory.summary

Export output directory.

# flags.orgApiVersion.summary

Salesforce API Version

# examples

- <%= config.bin %> <%= command.id %> -o gmpkg-demo --api-version=58.0 -d "/data/Opportunity/export" -n "Opportunity_All_Grid,Opportunity_Pipeline_Grid"
- <%= config.bin %> <%= command.id %> -o gmpkg-demo --api-version=58.0 -d "/data/Opportunity/export" -q "Select Id, Name From gmpkg_xUser_Grid_c Where gmpkg_Object_Name_c = 'Opportunity'"
