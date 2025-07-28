import React from 'react';
import { Box } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowTrendUp, faArrowTrendDown, faEquals, faQuestion } from '@fortawesome/free-solid-svg-icons';
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import MqText from '../../components/core/text/MqText'
import { TableLineageJobNodeData } from './nodes'
import { PositionedNode } from '../../../libs/graph'
import { Theme } from '@mui/material/styles';

interface CriticityProps {
  prev_V_crit: number | null;
  next_V_crit: number | null;
  prev_P_crit: number | null;
  next_P_crit: number | null;
  prev_S_crit: number | null;
  next_S_crit: number | null;
}

// Définissez les types appropriés pour 'node' et 'theme' si possible
interface JobCriticityBoxProps {
  node: PositionedNode<'job', TableLineageJobNodeData>;
  theme: Theme;
  handleClick: () => void;
  ICON_SIZE: number;
  criticity: CriticityProps
}
const formatValue = (val: number | null) => val === null ? '?' : val;

const addToToolTip = (crit_type: string, prev: number | null, next: number | null) => {
  return (
    <foreignObject>
      <Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <MqText block bold>
           {`${crit_type}: ${formatValue(prev)} → ${formatValue(next)}`}
          </MqText>
        </Box>
      </Box>
    </foreignObject>
  )
}

 // Fonction pour déterminer l'icône à afficher en fonction des valeurs Prev et Next
  const getIcon = (prev: number | null, next: number | null) => {
    if (prev === null || next === null) {
    return faQuestion;
  } 
    if (prev > next) {
      return faArrowTrendDown;
    } else if (prev < next) {
      return faArrowTrendUp;
    } else {
      return faEquals;
    }
  };
  
const JobCriticityBox: React.FC<JobCriticityBoxProps & {offSetY?: number}> = ({ node, theme, handleClick, ICON_SIZE, criticity, offSetY = 0}) => {
 
  return (
    <g>
      <Box
        component={'rect'}
        x={node.width - 35}
        y={node.height - 2 + offSetY }
        width={52}
        height={20}
        sx={{
          fill: theme.palette.secondary.main,
          cursor: 'pointer',
          rx: 2,
        }}
        onClick={handleClick}
      />
      {/* Idem pour les icônes */}
      <MQTooltip title={addToToolTip("V", criticity.prev_V_crit, criticity.next_V_crit)} placement={'bottom'}>
        <g>
          <FontAwesomeIcon
            aria-hidden={true}
            title={''}
            icon={getIcon(criticity.prev_V_crit, criticity.next_V_crit)}
            width={ICON_SIZE}
            height={ICON_SIZE}
            x={node.width - 31}
            y={node.height + 2 + offSetY } 
            color={theme.palette.vital.light}
            onClick={handleClick}
          />
        </g>
      </MQTooltip>
      <MQTooltip title={addToToolTip("P", criticity.prev_P_crit, criticity.next_P_crit)} placement={'bottom'}>
        <g>
      <FontAwesomeIcon
        aria-hidden={true}
        title={''}
        icon={getIcon(criticity.prev_P_crit, criticity.next_P_crit)}
        width={ICON_SIZE}
        height={ICON_SIZE}
        x={node.width - 15}
        y={node.height + 2 + offSetY}
        color={theme.palette.personnel.light}
        onClick={handleClick}
      />
      </g>
      </MQTooltip>
      <MQTooltip title={addToToolTip("S", criticity.prev_S_crit, criticity.next_S_crit)} placement={'bottom'}>
        <g>
      <FontAwesomeIcon
        aria-hidden={true}
        title={''}
        icon={getIcon(criticity.prev_S_crit, criticity.next_S_crit)}
        width={ICON_SIZE}
        height={ICON_SIZE}
        x={node.width + 1}
        y={node.height + 2 + offSetY}
        color={theme.palette.strategique.light
        }
        onClick={handleClick}
      />
      </g>
      </MQTooltip>
    </g>
  );
};

export {JobCriticityBox, CriticityProps};
