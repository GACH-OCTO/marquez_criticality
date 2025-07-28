import React from 'react';
import { Box } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faQuestion } from '@fortawesome/free-solid-svg-icons';
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import MqText from '../../components/core/text/MqText'
import { TableLineageDatasetNodeData } from './nodes'
import { PositionedNode } from '../../../libs/graph'
import { Theme } from '@mui/material/styles';

type Warning = {
  id: string;
  title: string;
  description: string;
  isEffective: () => boolean;
};

// Définissez les types appropriés pour 'node' et 'theme' si possible
interface DatasetWarningBoxProps {
  node: PositionedNode<'DATASET', TableLineageDatasetNodeData>;
  theme: Theme;
  handleClick: () => void;
  ICON_SIZE: number;
  warnings: boolean[]
}

const addToToolTip = () => {
  return (
    <foreignObject>
      <Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <MqText block bold>
           Warnings
          </MqText>
        </Box>
      </Box>
    </foreignObject>
  )
}
  
const DatasetWarningBox: React.FC<DatasetWarningBoxProps > = ({ node, theme, handleClick, ICON_SIZE, warnings}) => {
  const warningCount = warnings.filter(Boolean).length;
  if (warningCount === 0) return null;

  return (
    <g>
      <circle
        cx={node.width - 9}
        cy={node.height + 8}
        r={13}
        fill={theme.palette.secondary.main}
        cursor="pointer"
        onClick={handleClick}
      />

      <MQTooltip title={addToToolTip()} placement="bottom">
        <g>
          <FontAwesomeIcon
            aria-hidden={true}
            title=""
            icon={faTriangleExclamation}
            width={ICON_SIZE}
            height={ICON_SIZE}
            x={node.width - 16}
            y={node.height}
            color={theme.palette.warning.main}
            onClick={handleClick}
          />
        </g>
      </MQTooltip>
      <g>
        <circle
          cx={node.width + 2}
          cy={node.height + 20}
          r={8}
          fill={theme.palette.error.main}
          cursor="pointer"
          onClick={handleClick}
        />
        <text
          x={node.width + 2}
          y={node.height + 24}
          fontSize={12}
          fill="white"
          textAnchor="middle"
          pointerEvents="none"
          fontWeight="bold"
        >
          {warningCount}
        </text>
      </g>
    </g>
  );
};

export {DatasetWarningBox};
