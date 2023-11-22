import React from 'react';
import {
  Button,
} from '@edx/paragon';
import { Tag, Close } from '@edx/paragon/icons';
import PropTypes from 'prop-types';

import TagOutlineIcon from './TagOutlineIcon';

const TagBubble = ({
  value, implicit, level, lineage, removeTagHandler,
}) => {
  const className = `tag-bubble mb-2 ${implicit ? 'implicit' : ''}`;
  const tagIcon = () => (implicit ? <TagOutlineIcon className="implicit-tag-icon" /> : <Tag />);

  const handleClick = (e) => {
    if (e.target.value) {
      e.target.checked = false;
      removeTagHandler(e);
    }
  };

  return (
    <div style={{ paddingLeft: `${level * 1}rem` }}>
      <Button
        className={className}
        variant="outline-dark"
        iconBefore={tagIcon}
        iconAfter={!implicit ? Close : null}
        onClick={!implicit ? handleClick : null}
        value={lineage.join(',')}
      >
        {value}
      </Button>
    </div>
  );
};

TagBubble.defaultProps = {
  implicit: true,
  level: 0,
};

TagBubble.propTypes = {
  value: PropTypes.string.isRequired,
  implicit: PropTypes.bool,
  level: PropTypes.number,
  lineage: PropTypes.arrayOf(PropTypes.string).isRequired,
  removeTagHandler: PropTypes.func.isRequired,
};

export default TagBubble;
