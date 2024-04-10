import React from 'react';
import {
  render, screen, within, fireEvent,
} from '@testing-library/react';
import TagsTree from './TagsTree';
import { contentTaxonomyTagsTreeMock } from './__mocks__';

const mockRemoveTagHandler = jest.fn();

describe('<TagsTree>', () => {
  it('should render component and tags correctly', () => {
    render(<TagsTree tags={contentTaxonomyTagsTreeMock} />);
    expect(screen.getByText('hierarchical taxonomy tag 1')).toBeInTheDocument();
    expect(screen.getByText('hierarchical taxonomy tag 2.13')).toBeInTheDocument();
    expect(screen.getByText('hierarchical taxonomy tag 3.4.50')).toBeInTheDocument();
  });

  it('should call removeTagHandler when "x" clicked on explicit tag', async () => {
    render(
      <TagsTree
        tags={contentTaxonomyTagsTreeMock}
        removeTagHandler={mockRemoveTagHandler}
      />,
    );
    const view = screen.getByText(/hierarchical taxonomy tag 1\.7\.59/i);
    const xButton = within(view).getByRole('button', {
      name: /close/i,
    });
    fireEvent.click(xButton);
    expect(mockRemoveTagHandler).toHaveBeenCalled();
  });
});
