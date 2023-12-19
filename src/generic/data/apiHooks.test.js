import { useQuery } from '@tanstack/react-query';
import { useOrganizationListData } from './apiHooks';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('./api', () => ({
  updateContentTaxonomyTags: jest.fn(),
}));

describe('useOrganizationListData', () => {
  it('should return success response', () => {
    const orgs = ['org1', 'org2'];
    useQuery.mockReturnValueOnce({ isSuccess: true, data: orgs });
    const result = useOrganizationListData();

    expect(result).toEqual({ isSuccess: true, data: orgs });
  });

  it('should return failure response', () => {
    useQuery.mockReturnValueOnce({ isSuccess: false });
    const result = useOrganizationListData();

    expect(result).toEqual({ isSuccess: false });
  });
});
