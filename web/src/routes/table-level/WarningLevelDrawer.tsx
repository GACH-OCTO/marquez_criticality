import * as Redux from 'redux'
import { Box } from '@mui/system'
import { IState } from '../../store/reducers'
import { LineageDataset, LineageJob } from '../../types/lineage'
import { LineageGraph } from '../../types/api'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import JobDetailPage from '../../components/jobs/JobDetailPage'
import React from 'react'
import WarningDetailPage from '../../components/datasets/WarningDetailPage'

const WIDTH = 800

interface StateProps {
  lineageGraph: LineageGraph
}
interface DispatchProps {}
const TableLevelDrawer = ({ lineageGraph }: StateProps & DispatchProps) => {
  const [searchParams] = useSearchParams()

  const node = lineageGraph.graph.find(
    (node) => node.id === searchParams.get('tableLevelNode') || ''
  )

  let dataset = null
  let job = null
  if (node?.type === 'DATASET') {
    dataset = node.data as LineageDataset
  } else if (node?.type === 'JOB') {
    job = node.data as LineageJob
  }

  return (
    <Box width={`${WIDTH}px`}>
      {dataset ? (
        <WarningDetailPage lineageDataset={dataset} />
      ) : (
        <>{job && <JobDetailPage lineageJob={job} />}</>
      )}
    </Box>
  )
}

const mapStateToProps = (state: IState) => ({
  lineageGraph: state.lineage.lineage,
})

const mapDispatchToProps = (dispatch: Redux.Dispatch) => bindActionCreators({}, dispatch)
export default connect(mapStateToProps, mapDispatchToProps)(TableLevelDrawer)
