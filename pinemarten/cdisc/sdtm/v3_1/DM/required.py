import sys
sys.path.append('...')
from adsl_byhand import CdiscColumn
    
STUDYID = CdiscColumn('Study Identifier', is_identifier=True)
USUBJID = CdiscColumn('Unique Subject Identifier', is_identifier=True)
SUBJID = CdiscColumn('Subject Identifier for the Study')
SITEID = CdiscColumn('Study Site Identifier')

ARM = CdiscColumn(label='Description of Planned Arm')
ACTARM = CdiscColumn(label='Description of Actual Arm')
ARMCD = CdiscColumn(label='Planned Arm (N)')
ACTARMCD = CdiscColumn(label='Actual Arm (N)')

TESTVAR = CdiscColumn('')
