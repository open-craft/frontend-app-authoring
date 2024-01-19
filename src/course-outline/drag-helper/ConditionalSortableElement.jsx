import React from 'react';
import PropTypes from 'prop-types';
import { Row } from '@edx/paragon';
import { SortableItem } from '@edx/frontend-lib-content-components';

const ConditionalSortableElement = ({
  id,
  draggable,
  children,
  componentStyle,
}) => {
  const style = {
    background: 'white',
    padding: '1rem 1.5rem',
    marginBottom: '1.5rem',
    borderRadius: '0.35rem',
    boxShadow: '0 0 .125rem rgba(0, 0, 0, .15), 0 0 .25rem rgba(0, 0, 0, .15)',
    display: 'flex',
    flexWrap: 'nowrap',
    ...componentStyle,
  };

  if (draggable) {
    return (
      <SortableItem
        id={id}
        componentStyle={style}
      >
        <div className="extend-margin">
          {children}
        </div>
      </SortableItem>
    );
  }
  return (
    <Row
      data-testid="conditional-sortable-element--no-drag-handle"
      style={style}
      className="mx-0"
    >
      {children}
    </Row>
  );
};

ConditionalSortableElement.defaultProps = {
  componentStyle: null,
};

ConditionalSortableElement.propTypes = {
  id: PropTypes.string.isRequired,
  draggable: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
  componentStyle: PropTypes.shape({}),
};

export default ConditionalSortableElement;
