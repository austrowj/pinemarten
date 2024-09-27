import pinemarten.definitions as defs
from pinemarten.cdisc.sdtm.v3_1.DM import required as DM

STUDYID = defs.Predecessor(DM.STUDYID)
DOMAIN = defs.CdiscColumn()
USUBJID = defs.Predecessor(DM.USUBJID)
SUBJID = defs.Predecessor(DM.SUBJID)
