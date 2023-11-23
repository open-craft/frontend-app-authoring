import React from 'react';
import {
  Chip,
} from '@edx/paragon';
import { Tag, Close } from '@edx/paragon/icons';
import PropTypes from 'prop-types';

import TagOutlineIcon from './TagOutlineIcon';

const TagBubble = ({
  value, implicit, level, lineage, removeTagHandler,
}) => {
  const className = `tag-bubble mb-2 ${implicit ? 'implicit' : ''}`;

  const handleClick = React.useCallback(() => {
    if (!implicit) {
      removeTagHandler(lineage.join(','), false);
    }
  }, [implicit, lineage]);

  return (
    <div style={{ paddingLeft: `${level * 1}rem` }}>
      <Chip
        className={className}
        variant="light"
        iconBefore={!implicit ? Tag : TagOutlineIcon}
        iconAfter={!implicit ? Close : null}
        onIconAfterClick={handleClick}
      >
        {value}
      </Chip>
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
