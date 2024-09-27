import pinemarten.definitions as defs

STUDYID = defs.CdiscColumn('Study Identifier', is_identifier=True)
DOMAIN = defs.CdiscColumn('Domain') # not the correct label
USUBJID = defs.CdiscColumn('Unique Subject Identifier', is_identifier=True)
SUBJID = defs.CdiscColumn('Subject Identifier for the Study')
SITEID = defs.CdiscColumn('Study Site Identifier')

ARM = defs.CdiscColumn(label='Description of Planned Arm')
ACTARM = defs.CdiscColumn(label='Description of Actual Arm')
ARMCD = defs.CdiscColumn(label='Planned Arm (N)')
ACTARMCD = defs.CdiscColumn(label='Actual Arm (N)')
