// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as Redux from 'redux'
import {
  Box,
  createTheme
} from '@mui/material'
import { CircularProgress } from '@mui/material'
import { Dataset } from '../../types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IState } from '../../store/reducers'
import { LineageDataset } from '../../types/lineage'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import {
  deleteDataset,
  dialogToggle,
  fetchDataset,
  resetDataset,
  resetDatasetVersions,
  setTabIndex,
} from '../../store/actionCreators'
import { faWarning } from '@fortawesome/free-solid-svg-icons'
import { truncateText } from '../../helpers/text'
import {useSearchParams } from 'react-router-dom'
import { useTheme } from '@emotion/react'
import CloseIcon from '@mui/icons-material/Close'
import WarningInfo from './WarningInfo'
import DatasetVersions from './DatasetVersions'
import IconButton from '@mui/material/IconButton'
import MqText from '../core/text/MqText'
import React, { ChangeEvent, FunctionComponent, useEffect, useState } from 'react'

interface StateProps {
  lineageDataset: LineageDataset
  dataset: Dataset
  isDatasetLoading: boolean
  datasets: IState['datasets']
  display: IState['display']
  tabIndex: IState['lineage']['tabIndex']
}

interface DispatchProps {
  fetchDataset: typeof fetchDataset
  resetDatasetVersions: typeof resetDatasetVersions
  resetDataset: typeof resetDataset
  deleteDataset: typeof deleteDataset
  dialogToggle: typeof dialogToggle
  setTabIndex: typeof setTabIndex
}

type IProps = StateProps & DispatchProps

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  }
}

const WarningDetailPage: FunctionComponent<IProps> = (props) => {
  const {
    dataset,
    isDatasetLoading,
    fetchDataset,
    resetDataset,
    resetDatasetVersions,
    lineageDataset,
    tabIndex,
    setTabIndex,
  } = props
  const theme = createTheme(useTheme())
  const [_, setSearchParams] = useSearchParams()
  const [showTags, setShowTags] = useState(false)

  // unmounting
  useEffect(
    () => () => {
      resetDataset()
      resetDatasetVersions()
    },
    []
  )

  // might need to map first version to its own state
  useEffect(() => {
    fetchDataset(lineageDataset.namespace, lineageDataset.name)
  }, [lineageDataset.name])

  const handleChange = (_: ChangeEvent, newValue: number) => {
    setTabIndex(newValue)
  }

  if (!dataset || isDatasetLoading) {
    return (
      <Box display={'flex'} justifyContent={'center'} mt={2}>
        <CircularProgress color='primary' />
      </Box>
    )
  }

  const { name, tags, description } = dataset
  interface nodeCriticityProps {
    V_Crit: number | null
    P_Crit: number | null 
    S_Crit: number | null
  }
  function extractCritValues(tags: string[]): nodeCriticityProps {
    return {
      V_Crit: extractCrit(tags, 'V'),
      P_Crit: extractCrit(tags, 'P'),
      S_Crit: extractCrit(tags, 'S'),
    };
  }
  const extractCrit = (tags: string[], prefix: string): number | null =>
  tags.reduce((acc, tag) => {
    const match = tag.match(new RegExp(`^${prefix}(\\d)$`));
    return acc ?? (match ? parseInt(match[1], 10) : null);
  }, null);
  const extractCritTagNum = (tags: string[] | undefined, prefix: string): number => {
  return tags?.filter(tag => tag.startsWith(prefix)).length || 0;
};
  const nodeCriticity = dataset?.tags?.length ? extractCritValues(dataset.tags) : null;

  return (
    <Box px={2}>
      <Box
        position={'sticky'}
        top={0}
        bgcolor={theme.palette.background.default}
        pt={2}
        zIndex={theme.zIndex.appBar}
        sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}
        mb={2}
      >
        <Box display={'flex'} alignItems={'center'} justifyContent={'space-between'} pb={2}>
          <Box display={'flex'} alignItems={'center'}>
            <Box>
              <Box display={'flex'} alignItems={'center'}>
                <Box
                  mr={2}
                  borderRadius={theme.spacing(1)}
                  p={1}
                  width={32}
                  height={32}
                  display={'flex'}
                  bgcolor={theme.palette.error.main}
                >
                  <FontAwesomeIcon
                    aria-hidden={'true'}
                    title={'Warning'}
                    icon={faWarning}
                    width={16}
                    height={16}
                    color={theme.palette.warning.main}
                  />
                </Box>
                <MqText font={'mono'} heading>
                  {truncateText(name, 40)}
                </MqText>
              </Box>
              <MqText subdued>{description}</MqText>
            </Box>
          </Box>
          <Box display={'flex'} alignItems={'center'}>
            <IconButton onClick={() => setSearchParams({})}>
              <CloseIcon fontSize={'small'} />
            </IconButton>
          </Box>
        </Box>
      </Box>
      {tabIndex === 0 && (
        <WarningInfo
          dataset={dataset}
          datasetFields={dataset.fields}
          facets={dataset.facets}
          showTags={showTags}
          warnings={[
                  !(nodeCriticity?.P_Crit && nodeCriticity?.S_Crit && nodeCriticity?.V_Crit), 
                  !(dataset?.description),
                  !(dataset?.fields?.every(field => !!field.description)),
                  !(dataset?.fields?.every(field => !!field.type)),
                  !!(extractCritTagNum(dataset?.tags, "V") > 1),
                  !!(extractCritTagNum(dataset?.tags, "P") > 1),
                  !!(extractCritTagNum(dataset?.tags, "S") > 1),]}
          isCurrentVersion
        />
      )}
      {tabIndex === 1 && <DatasetVersions dataset={dataset} />}
    </Box>
  )
}

const mapStateToProps = (state: IState) => ({
  datasets: state.datasets,
  dataset: state.dataset.result,
  isDatasetLoading: state.dataset.isLoading,
  display: state.display,
  tabIndex: state.lineage.tabIndex,
})

const mapDispatchToProps = (dispatch: Redux.Dispatch) =>
  bindActionCreators(
    {
      fetchDataset: fetchDataset,
      resetDatasetVersions: resetDatasetVersions,
      resetDataset: resetDataset,
      deleteDataset: deleteDataset,
      dialogToggle: dialogToggle,
      setTabIndex: setTabIndex,
    },
    dispatch
  )

export default connect(mapStateToProps, mapDispatchToProps)(WarningDetailPage)
