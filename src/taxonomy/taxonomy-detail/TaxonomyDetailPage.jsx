import React from 'react';
import {
  Container,
  Layout,
} from '@edx/paragon';
import Proptypes from 'prop-types';

import PermissionDeniedAlert from '../../generic/PermissionDeniedAlert';
import Loading from '../../generic/Loading';
import Header from '../../header';
import SubHeader from '../../generic/sub-header/SubHeader';
import TaxonomyDetailSideCard from './TaxonomyDetailSideCard';
import TagListTable from './TagListTable';
import { useTaxonomyDetailDataResponse, useTaxonomyDetailDataStatus } from '../api/hooks/selectors';

const TaxonomyDetailContent = ({ taxonomyId }) => {
  const useTaxonomyDetailData = () => {
    const { isError, isFetched } = useTaxonomyDetailDataStatus(taxonomyId);
    const taxonomy = useTaxonomyDetailDataResponse(taxonomyId);
    return { isError, isFetched, taxonomy };
  };

  const { isError, isFetched, taxonomy } = useTaxonomyDetailData(taxonomyId);

  if (isError) {
    return (
      <PermissionDeniedAlert />
    );
  }

  if (!isFetched) {
    return (
      <Loading />
    );
  }

  if (taxonomy) {
    return (
      <>
        <div className="pt-4.5 pr-4.5 pl-4.5 pb-2 bg-light-100 box-shadow-down-2">
          <Container size="xl">
            <SubHeader
              title={taxonomy.name}
              hideBorder
            />
          </Container>
        </div>
        <div className="bg-light-400 m-4">
          <Layout
            lg={[{ span: 9 }, { span: 3 }]}
            md={[{ span: 9 }, { span: 3 }]}
            sm={[{ span: 9 }, { span: 3 }]}
            xs={[{ span: 9 }, { span: 3 }]}
            xl={[{ span: 9 }, { span: 3 }]}
          >
            <Layout.Element>
              <TagListTable />
            </Layout.Element>
            <Layout.Element>
              <TaxonomyDetailSideCard taxonomy={taxonomy} />
            </Layout.Element>

          </Layout>
        </div>
      </>
    );
  }

  return undefined;
};

const TaxonomyDetailPage = ({ taxonomyId }) => (
  <>
    <style>
      {`
        body {
            background-color: #E9E6E4; /* light-400 */
        }
      `}
    </style>
    <Header isHiddenMainMenu />
    <TaxonomyDetailContent taxonomyId={taxonomyId} />
  </>
);

TaxonomyDetailPage.propTypes = {
  taxonomyId: Proptypes.number,
};

TaxonomyDetailPage.defaultProps = {
  taxonomyId: undefined,
};

TaxonomyDetailContent.propTypes = TaxonomyDetailPage.propTypes;
TaxonomyDetailContent.defaultProps = TaxonomyDetailPage.defaultProps;

export default TaxonomyDetailPage;
