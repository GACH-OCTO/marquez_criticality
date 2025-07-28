import { Divider } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IState } from '../../store/reducers'
import { LineageGraph } from '../../types/api'
import { LineageJob } from '../../types/lineage'
import { PositionedNode } from '../../../libs/graph'
import { TableLineageJobNodeData } from './nodes'
import { connect } from 'react-redux'
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog'
import { formatUpdatedAt } from '../../helpers'
import { runStateColor } from '../../helpers/nodes'
import { theme } from '../../helpers/theme'
import { truncateText, truncateTextFront } from '../../helpers/text'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from '@mui/icons-material'
import * as Redux from 'redux'
import { bindActionCreators } from 'redux'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/system/Box'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import MqStatus from '../../components/core/status/MqStatus'
import MqText from '../../components/core/text/MqText'
import React, { useEffect, useState } from 'react'
import { Dataset } from '../../types/api'
import {JobCriticityBox, CriticityProps} from './JobCriticityBox'
import { fetchDataset, resetDataset } from '../../store/actionCreators'
import { Theme } from '@mui/material/styles';
import {
  getDataset,
} from '../../store/requests'



interface DispatchProps {
  fetchDataset: typeof fetchDataset
  resetDataset: typeof resetDataset
}

interface StateProps {
  lineage: LineageGraph
}

interface TableLineageJobNodeProps {
  node: PositionedNode<'job', TableLineageJobNodeData>
}

const ICON_SIZE = 12

const TableLineageJobNode = ({ node, fetchDataset, resetDataset }: TableLineageJobNodeProps & StateProps & DispatchProps) => {
  const navigate = useNavigate()
  const { name, namespace } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const isCollapsed = searchParams.get('collapsedNodes')?.split(',').includes(node.id)
  
  const extractDigit = (prefix: string, input: Dataset): number | null => {
  return input.tags.reduce((acc, tag) => {
    const match = tag.match(new RegExp(`^${prefix}(\\d)$`));
    return acc || (match ? parseInt(match[1], 10) : null);
  }, null);
};

  const [prevDatasetNode, setPrevDatasetNode] = useState<Dataset[]>([])
  const [nextDatasetNode, setNextDatasetNode] = useState<Dataset[]>([])
  const [criticities, setCriticities] = useState<CriticityProps[]>([])
  useEffect(() => {
    const callDatasetInputs = node.data.job.inputs.map(input => getDataset(input.namespace, input.name));
    const callDatasetOutputs = node.data.job.outputs.map(input => getDataset(input.namespace, input.name));
    Promise.all([...callDatasetInputs, ...callDatasetOutputs]).then((allDatasets) => {
    const inputCount = callDatasetInputs.length;
    const inputDatasets = allDatasets.slice(0, inputCount);
    const outputDatasets = allDatasets.slice(inputCount);

    setPrevDatasetNode(inputDatasets);
    setNextDatasetNode(outputDatasets);
      const nextCriticity = outputDatasets.map(output => ({
        next_V_crit: extractDigit("V", output),
        next_P_crit: extractDigit("P", output),
        next_S_crit: extractDigit("S", output),
      }));
  
    const nextCrit = nextCriticity[0] || { next_V_crit: null, next_P_crit: null, next_S_crit: null };

    const criticity: CriticityProps[] = inputDatasets.map(input => ({
      prev_V_crit: extractDigit("V", input),
      next_V_crit: nextCrit.next_V_crit,
      prev_P_crit: extractDigit("P", input),
      next_P_crit: nextCrit.next_P_crit,
      prev_S_crit: extractDigit("S", input),
      next_S_crit: nextCrit.next_S_crit,
    }));

    setCriticities(criticity)
    });
  }, []);
  const singleInputDataset = prevDatasetNode.length == 1 
  const singleOutputDataset = nextDatasetNode.length == 1
  const multipleInputDataset = prevDatasetNode.length > 1
  
  const isSelected = name === node.data.job.name && namespace === node.data.job.namespace
  /*
  let inputDatasets: any[] = [];
  if (node.data.job.inputs) {
    inputDatasets = node.data.job.inputs.map(input => {
      return () => fetchDataset(input.namespace, input.name);
    });
  }
*/
  const handleClick = () => {
    navigate(
      `/lineage/job/${encodeURIComponent(node.data.job.namespace)}/${encodeURIComponent(
        node.data.job.name
      )}?tableLevelNode=${encodeURIComponent(node.id)}`
    )
     
    /**
    // Téléchargement de fichier (Sorties de FetchDataset autour d"'un job)

    const fileName = `${node.data.job.name}.json`;
    const content = {
      inputDatasets
    };
    const jsonContent = JSON.stringify(content, null, 2);
    const fileType = 'application/json';

    const blob = new Blob([jsonContent], { type: fileType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);


    // Téléchargement de fichier (lineage autour d'un job)
    const fileName = `${node.data.job.name}.json`;
    const content = {
      [node.data.job.name]: {
        inputs: node.data.job.inputs,
        outputs: node.data.job.outputs
      }
    };
    const jsonContent = JSON.stringify(content, null, 2);
    const fileType = 'application/json';

    const blob = new Blob([jsonContent], { type: fileType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
     */
  }

  const renderCriticities = (node: PositionedNode<"job", TableLineageJobNodeData>, theme: Theme, handleClick: () => void, ICON_SIZE: number , criticities: CriticityProps[]) => {
  return criticities.map((criticity, index) => (
    <JobCriticityBox
      key={`${node.id}-${index}`}
      node={node}
      theme={theme}
      handleClick={handleClick}
      ICON_SIZE={ICON_SIZE}
      criticity={criticity}
      offSetY={index * 28}
    />
  ));
};

  const addToToolTip = (job: LineageJob) => {
    return (
      <foreignObject>
        <Box>
          <Box display={'flex'} justifyContent={'space-between'}>
            <MqText block bold sx={{ mr: 6 }}>
              Namespace:
            </MqText>
            <MqText block font={'mono'}>
              {truncateTextFront(job.namespace, 40)}
            </MqText>
          </Box>
          <Box display={'flex'} justifyContent={'space-between'}>
            <MqText block bold sx={{ mr: 6 }}>
              Name:
            </MqText>
            <MqText block font={'mono'}>
              {truncateTextFront(job.name, 40)}
            </MqText>
          </Box>
          {job.description && (
            <Box display={'flex'} justifyContent={'space-between'}>
              <MqText block bold sx={{ mr: 6 }}>
                Description:
              </MqText>
              <MqText block font={'mono'}>
                {job.description}
              </MqText>
            </Box>
          )}
          <Box display={'flex'} justifyContent={'space-between'}>
            <MqText block bold sx={{ mr: 6 }}>
              Updated at:
            </MqText>
            <MqText block font={'mono'}>
              {formatUpdatedAt(job.updatedAt)}
            </MqText>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
            <MqText block bold sx={{ mr: 6 }}>
              Latest Run:
            </MqText>
            <MqStatus
              label={job.latestRun?.state || 'N/A'}
              color={
                job.latestRun?.state
                  ? runStateColor(job.latestRun?.state)
                  : theme.palette.secondary.main
              }
            />
          </Box>
        </Box>
      </foreignObject>
    )
  }

 return (
  <g>
    <Box
      component={'rect'}
      sx={{
        x: 0,
        y: 0,
        width: node.width,
        height: node.height,
        filter: null,
        stroke: 'white',      
        strokeWidth: isSelected ? 1 : 0,
        rx: 4,
        fill: theme.palette.background.paper,
        cursor: 'pointer',
        transition: 'filter 0.3s',
      }}
      onClick={handleClick}
    />
    <Box
      component={'rect'}
      x={0}
      y={0}
      height={node.height}
      width={24}
      sx={{
        rx: 4,
        fill: node.data.job.latestRun
          ? runStateColor(node.data.job.latestRun.state)
          : theme.palette.secondary.main,
      }}
    />
    <FontAwesomeIcon
      aria-hidden={'true'}
      title={'Job'}
      icon={faCog}
      width={ICON_SIZE}
      height={ICON_SIZE}
      x={6}
      y={ICON_SIZE / 2}
      color={theme.palette.common.white}
      onClick={handleClick}
    />
    <MQTooltip title={addToToolTip(node.data.job)} placement={'right-start'}>
      <g>
        <text
          fontSize="8"
          fontFamily={`${'Source Code Pro'}, mono`}
          fill={'white'}
          x={28}
          y={10}
          onClick={handleClick}
          cursor={'pointer'}
        >
          JOB
        </text>
        <text fontSize="8" fill={'white'} x={28} y={20} onClick={handleClick} cursor={'pointer'}>
          {truncateText(node.data.job.name, 16)}
        </text>
      </g>
    </MQTooltip>
    {multipleInputDataset && (
       <foreignObject width={16} height={24} x={node.width - 18} y={0}>
        <MQTooltip title={isCollapsed ? 'Expand' : 'Collapse'} placement={'top'}>
          <IconButton
            sx={{ width: 10, height: 10 }}
            onClick={(event) => {
            const current = searchParams.get('collapsedNodes')
            const collapsedNodes = current ? current.split(',') : []

            const newCollapsedNodes = collapsedNodes.includes(node.id)
              ? collapsedNodes.filter(id => id !== node.id)
              : [...collapsedNodes, node.id]

            const newParams = new URLSearchParams(searchParams.toString())
            newParams.set('collapsedNodes', newCollapsedNodes.join(','))
            setSearchParams(newParams)
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
    )}
    {/* Dropdown content when expanded */}
      {!isCollapsed && multipleInputDataset && renderCriticities(node, theme, handleClick, ICON_SIZE, criticities)}

    {singleInputDataset && singleOutputDataset && (
  <JobCriticityBox
    node={node}
    theme={theme}
    handleClick={handleClick}
    ICON_SIZE={ICON_SIZE}
    criticity={criticities[0]}
  />
)}
  </g>
);
}


TableLineageJobNode.getLayoutOptions = (node: TableLineageJobNodeProps['node']) => ({
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

export default connect(mapStateToProps, mapDispatchToProps)(TableLineageJobNode)
