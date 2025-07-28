import { ChevronLeft } from '@mui/icons-material'
import { Dataset, LineageGraph } from '../../types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IState } from '../../store/reducers'
import { LineageDataset } from '../../types/lineage'
import { PositionedNode } from '../../../libs/graph'
import { THEME_EXTRA, theme } from '../../helpers/theme'
import { TableLineageDatasetNodeData } from './nodes'
import { connect } from 'react-redux'
import * as Redux from 'redux'
import { Divider } from '@mui/material'
import { bindActionCreators } from 'redux'
import { datasetFacetsQualityAssertions, datasetFacetsStatus } from '../../helpers/nodes'
import { faDatabase } from '@fortawesome/free-solid-svg-icons/faDatabase'
import { fetchDataset, resetDataset } from '../../store/actionCreators'
import { formatUpdatedAt } from '../../helpers'
import { truncateText, truncateTextFront } from '../../helpers/text'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { alpha } from '@mui/material/styles';
import React, { useEffect, useState } from 'react'
import { DatasetWarningBox} from './DatasetWarningBox'
import {
  getDataset,
} from '../../store/requests'
import Box from '@mui/system/Box'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import MqStatus from '../../components/core/status/MqStatus'
import MqText from '../../components/core/text/MqText'

interface DispatchProps {
  fetchDataset: typeof fetchDataset
  resetDataset: typeof resetDataset
}

interface StateProps {
  lineage: LineageGraph
  dataset: Dataset
}

interface nodeCriticityProps {
  V_Crit: number | null
  P_Crit: number | null 
  S_Crit: number | null
}
const extractCrit = (tags: string[], prefix: string): number | null =>
  tags.reduce((acc, tag) => {
    const match = tag.match(new RegExp(`^${prefix}(\\d)$`));
    return acc ?? (match ? parseInt(match[1], 10) : null);
  }, null);

function extractCritValues(tags: string[]): nodeCriticityProps {
  return {
    V_Crit: extractCrit(tags, 'V'),
    P_Crit: extractCrit(tags, 'P'),
    S_Crit: extractCrit(tags, 'S'),
  };
}


interface TableLineageDatasetNodeProps {
  node: PositionedNode<'DATASET', TableLineageDatasetNodeData>
}

const ICON_SIZE = 12
const COMPACT_HEIGHT = 24

const TableLineageDatasetNode = ({
  node,
  dataset,
  fetchDataset,
  resetDataset,
}: TableLineageDatasetNodeProps & StateProps & DispatchProps) => {
  const isCompact = node.height === COMPACT_HEIGHT
  const { name, namespace } = useParams()
  const isSelected = name === node.data.dataset.name && namespace === node.data.dataset.namespace
  const [searchParams, setSearchParams] = useSearchParams()
  const isCollapsed = searchParams.get('collapsedNodes')?.split(',').includes(node.id)
  const navigate = useNavigate()

  const [nodeDataset, setNodeDataset] = useState<Dataset>()
  useEffect(() => {
  getDataset(node.data.dataset.namespace, node.data.dataset.name)
    .then(setNodeDataset)
    .catch((error) => {
      console.error("Erreur lors du chargement du dataset :", error);
    });
}, []);

  const handleClick = () => {
    navigate(
      `/lineage/dataset/${encodeURIComponent(node.data.dataset.namespace)}/${encodeURIComponent(
        node.data.dataset.name
      )}?tableLevelNode=${encodeURIComponent(node.id)}`
    )
  }

  const nodeCriticity = nodeDataset?.tags?.length ? extractCritValues(nodeDataset.tags) : null;

  const dropShadow =
  nodeCriticity?.P_Crit || nodeCriticity?.V_Crit || nodeCriticity?.S_Crit
    ? `
      drop-shadow(-30px 15px ${(6 - (nodeCriticity?.V_Crit ?? 0)) * 10}px ${alpha(theme.palette.vital.main, (nodeCriticity?.V_Crit ?? 0)/10*2)})
      drop-shadow(0 -20px ${(6 - (nodeCriticity?.P_Crit ?? 0)) * 10}px ${alpha(theme.palette.personnel.main, (nodeCriticity?.P_Crit ?? 0)/10*2)})
      drop-shadow(30px 15px ${(6 - (nodeCriticity?.S_Crit ?? 0)) * 10}px ${alpha(theme.palette.strategique.main,(nodeCriticity?.S_Crit ?? 0)/10*2)})
    `
    : 'none';


  /*const displayTags = (nodeCriticity: nodeCriticityProps) => {
    return (
      <ButtonBase
              id={id}
              component={RouterLink}
              to={to}
              disableRipple={true}
              sx={Object.assign(
                {
                  width: theme.spacing(6),
                  height: theme.spacing(6),
                  borderRadius: theme.spacing(1),
                  color: theme.palette.secondary.main,
                  transition: theme.transitions.create(['background-color', 'color']),
                  border: '2px solid transparent',
                },
                active
                  ? {
                      background: lighten(theme.palette.background.default, 0.05),
                      color: theme.palette.common.white,
                    }
                  : {}
              )}
            ></ButtonBase>
      nodeCriticity.V_Crit + nodeCriticity.P_Crit + nodeCriticity.S_Crit
    )
  }*/
  const addToToolTip = (lineageDataset: LineageDataset, dataset: Dataset) => {
    return (
      <foreignObject>
        <Box>
          <Box display={'flex'} justifyContent={'space-between'}>
            <MqText block bold sx={{ mr: 6 }}>
              Namespace:
            </MqText>
            <MqText block font={'mono'}>
              {truncateTextFront(lineageDataset.namespace, 40)}
            </MqText>
          </Box>
          <Box display={'flex'} justifyContent={'space-between'}>
            <MqText block bold sx={{ mr: 6 }}>
              Name:
            </MqText>
            <MqText block font={'mono'}>
              {truncateTextFront(lineageDataset.name, 40)}
            </MqText>
          </Box>
          {lineageDataset.description && (
            <Box display={'flex'} justifyContent={'space-between'}>
              <MqText block bold sx={{ mr: 6 }}>
                Description:
              </MqText>
              <MqText block font={'mono'}>
                {lineageDataset.description}
              </MqText>
            </Box>
          )}
          <Box display={'flex'} justifyContent={'space-between'}>
            <MqText block bold sx={{ mr: 6 }}>
              Updated at:
            </MqText>
            <MqText block font={'mono'}>
              {formatUpdatedAt(lineageDataset.updatedAt)}
            </MqText>
          </Box>
          {dataset && datasetFacetsStatus(dataset.facets) && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box display={'flex'} justifyContent={'space-between'}>
                <MqText block bold sx={{ mr: 6 }}>
                  Quality:
                </MqText>
                <MqStatus
                  label={
                    datasetFacetsQualityAssertions(dataset.facets).find((a) => !a.success)
                      ? 'UNHEALTHY'
                      : 'HEALTHY'
                  }
                  color={datasetFacetsStatus(dataset.facets)}
                />
              </Box>
            </>
          )}
        </Box>
      </foreignObject>
    )
  }

  return (
    <g>
      {nodeCriticity? 
      <Box
        component={'rect'}
        sx={{
          x: 0,
          y: 0,
          width: node.width,
          height: node.height +10,
          filter: dropShadow,
          rx: 4,
          fill: theme.palette.background.paper,
          stroke: 'white',      // ← bordure blanche
          strokeWidth: isSelected ? 1 : 0,
          cursor: 'pointer',
          transition: 'all 0.3',
        }}
        cursor={'pointer'}
        onClick={handleClick}
      />
      : 
      <Box
        component={'rect'}
        sx={{
          x: 0,
          y: 0,
          width: node.width,
          height: node.height + 10,
          filter: null,
          stroke: 'white',      
          strokeWidth: isSelected ? 1 : 0,
          rx: 4,
          fill: theme.palette.background.paper,
          cursor: 'pointer',
          transition: 'all 0.3',
        }}
        cursor={'pointer'}
        onClick={handleClick}
      />
      }
      
      <Box
        component={'rect'}
        x={0}
        y={0}
        height={34}
        width={24}
        sx={{ rx: 4, fill: theme.palette.info.main }}
      />

      <FontAwesomeIcon
        aria-hidden={'true'}
        title={'Job'}
        icon={faDatabase}
        width={ICON_SIZE}
        height={ICON_SIZE}
        x={6}
        y={ICON_SIZE / 2 + 5}
        color={theme.palette.common.white}
        onClick={handleClick}
      />
      <foreignObject width={16} height={34} x={node.width - 18} y={0}>
        <MQTooltip title={isCollapsed ? 'Expand' : 'Collapse'} placement={'top'}>
          <IconButton
            sx={{ width: 10, height: 10 }}
            onClick={(event) => {
              event.stopPropagation()
              const collapsedNodes = searchParams.get('collapsedNodes')
              if (collapsedNodes) {
                const collapsedNodesArray = collapsedNodes.split(',')
                if (collapsedNodesArray.includes(node.id)) {
                  collapsedNodesArray.splice(collapsedNodesArray.indexOf(node.id), 1)
                } else {
                  collapsedNodesArray.push(node.id)
                }
                searchParams.set('collapsedNodes', collapsedNodesArray.toString())
              } else {
                searchParams.set('collapsedNodes', node.id)
              }
              setSearchParams(searchParams)
            }}
          >
            <ChevronLeft
              sx={{
                width: 10,
                height: 10,
                rotate: !isCollapsed ? '-90deg' : 0,
                transition: 'rotate .3s',
              }}
            />
          </IconButton>
        </MQTooltip>
      </foreignObject>
      <MQTooltip
        onOpen={() => fetchDataset(node.data.dataset.namespace, node.data.dataset.name)}
        onClose={() => resetDataset}
        placement={'right-start'}
        title={addToToolTip(node.data.dataset, dataset)}
      >
        <g>
          <text
            fontSize='8'
            fontFamily={`${'Source Code Pro'}, mono`}
            fill={'white'}
            x={28}
            y={10}
            onClick={handleClick}
            cursor={'pointer'}
          >
            DATASET
          </text>
          <text fontSize='8' fill={'white'} x={28} y={20} cursor={'pointer'} onClick={handleClick}>
            {truncateText(node.data.dataset.name, 15)}
          </text>
          <text fontSize='8' fill={'white'} x={28} y={30} cursor={'pointer'} onClick={handleClick}>
            {(nodeCriticity?.P_Crit && nodeCriticity?.S_Crit && nodeCriticity?.V_Crit) ? (
            `V : ${nodeCriticity?.V_Crit}, P : ${nodeCriticity?.P_Crit}, S : ${nodeCriticity?.S_Crit}`
          ) : ("Missing Tags")}
          </text>
        </g>
      </MQTooltip>
      <DatasetWarningBox
              node={node}
              theme={theme}
              handleClick={handleClick}
              ICON_SIZE={16}
              warnings={
                [
                  !(nodeCriticity?.P_Crit && nodeCriticity?.S_Crit && nodeCriticity?.V_Crit), 
                  !(nodeDataset?.description),
                  !(nodeDataset?.fields?.every(field => !!field.description)),
                  !(nodeDataset?.fields?.every(field => !!field.type)),
                ]}
            />
      {!isCompact &&
        node.data.dataset.fields.map((field, index) => {
          return (
            <text
              key={field.name}
              fontSize='8'
              fill={THEME_EXTRA.typography.subdued}
              x={10}
              y={14 + 10 + 10 * (index + 1) + 10}
            >
              - {truncateText(field.name, 20)} {field.tags.length > 0 ? (<>Tags : {field.tags.map(tag =>tag+" ")}</> ): ""}
            </text>
          )
        })}
        
    </g>
  )
}

TableLineageDatasetNode.getLayoutOptions = (node: TableLineageDatasetNodeProps['node']) => ({
  ...node,
})

const mapStateToProps = (state: IState) => ({
  lineage: state.lineage.lineage,
  dataset: state.dataset.result,
})

const mapDispatchToProps = (dispatch: Redux.Dispatch) =>
  bindActionCreators(
    {
      fetchDataset: fetchDataset,
      resetDataset: resetDataset,
    },
    dispatch
  )

export default connect(mapStateToProps, mapDispatchToProps)(TableLineageDatasetNode)
