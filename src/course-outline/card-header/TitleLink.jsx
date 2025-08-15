import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button, Truncate } from '@openedx/paragon';

const TitleLink = ({
  title,
  titleLink,
  namePrefix,
}) => (
  <Button
    as={Link}
    variant="tertiary"
    data-testid={`${namePrefix}-card-header__title-link`}
    className="item-card-header__title-btn"
    to={titleLink}
  >
    <span className="truncate-1-line">
      {title}
    </span>
  </Button>
);

TitleLink.propTypes = {
  title: PropTypes.string.isRequired,
  titleLink: PropTypes.string.isRequired,
  namePrefix: PropTypes.string.isRequired,
};

export default TitleLink;
