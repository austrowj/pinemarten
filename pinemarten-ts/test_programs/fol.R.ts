export { };
import { Dataframe, fabricate_dataframe, print } from '../src/api/language';

const Subjects = Symbol();

function record(usubjid: number, site: string, randfl: 'Y' | 'N') { return {usubjid, site, randfl}; }

const df = fabricate_dataframe([
    record(1, 'here', 'Y'),
    record(2, 'here', 'N'),
    record(3, 'elsewhere', 'Y'),
    record(4, 'elsewhere', 'Y')
]);
print('Starting data:');
print(df);
