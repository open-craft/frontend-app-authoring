import {
  Card,
} from '@edx/paragon';
import Proptypes from 'prop-types';

const TaxonomyDetailSideCard = ({ taxonomy }) => (
  <Card>
    <Card.Header title="Taxonomy details" />
    <Card.Section title="Title">
      {taxonomy.name}
    </Card.Section>
    <Card.Divider className="ml-3 mr-3" />
    <Card.Section title="Description">
      {taxonomy.description}
    </Card.Section>
    <Card.Divider className="ml-3 mr-3" />
    <Card.Section title="Copyright">
      No copyright added
    </Card.Section>
  </Card>
);

TaxonomyDetailSideCard.propTypes = {
  taxonomy: Proptypes.object.isRequired,
};

export default TaxonomyDetailSideCard;
