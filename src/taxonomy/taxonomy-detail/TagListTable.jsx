import {
  DataTable,
  TextFilter,
} from '@edx/paragon';
import Proptypes from 'prop-types';

const tagsSample = [
  { name: 'Tag 1' },
  { name: 'Tag 2' },
  { name: 'Tag 3' },
  { name: 'Tag 4' },
  { name: 'Tag 5' },
  { name: 'Tag 6' },
  { name: 'Tag 7' },
];

const TagListTable = ({ tags }) => (
  <DataTable
    isFilterable
    isSortable
    defaultColumnValues={{ Filter: TextFilter }}
    itemCount={tagsSample.length}
    data={tagsSample}
    columns={[
      {
        Header: 'Name',
        accessor: 'name',
      },
    ]}
  >
    <DataTable.TableControlBar />
    <DataTable.Table />
    <DataTable.EmptyTable content="No results found" />
    <DataTable.TableFooter />
  </DataTable>
);

TagListTable.propTypes = {
  tags: Proptypes.array.isRequired,
};

export default TagListTable;
