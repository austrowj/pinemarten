import pinemarten.definitions as defs

STUDYID = defs.CdiscColumn('Study Identifier', is_identifier=True)
DOMAIN = defs.CdiscColumn()
USUBJID = defs.CdiscColumn('Unique Subject Identifier', is_identifier=True)
SUBJID = defs.CdiscColumn('Subject Identifier for the Study')

DSSEQ = defs.CdiscColumn()
DSTERM = defs.CdiscColumn()
DSDECOD = defs.CdiscColumn()
DSCAT = defs.CdiscColumn()
DSSCAT = defs.CdiscColumn()

DSSTDTC = defs.CdiscColumn()
DSSTDY = defs.CdiscColumn()
