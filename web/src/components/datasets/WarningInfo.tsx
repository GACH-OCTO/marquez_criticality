// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0
import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { Dataset, Field } from '../../types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWarning } from '@fortawesome/free-solid-svg-icons'
import {
  createTheme,
} from '@mui/material'
import { useTheme } from '@emotion/react'
import MqEmpty from '../core/empty/MqEmpty'
import MqText from '../core/text/MqText'
import React, { FunctionComponent } from 'react'

export interface JobFacetsProps {
  isCurrentVersion?: boolean
  dataset: Dataset
}

type DatasetInfoProps = {
  datasetFields: Field[]
  facets?: object
  showTags?: boolean
  warnings?: boolean[]
} & JobFacetsProps

 export const WarningsInfoList = [
{
  name: "Missing criticity tag",
  description: "At least one criticity tag is missing for this dataset.",
  consequence: "Not able to estimate the criticity of this dataset."
},
{
  name: "Missing dataset's description",
  description: "The description for this dataset is missing.",
  consequence: "For clarity and interpretation please include a description to this dataset."
},
{
  name: "Missing field's description",
  description: "At least one field of this dataset is missing a description.",
  consequence: "For clarity and interpretation please include a description for each field."
},
{
  name: "Missing field's type",
  description: "At least one field of this dataset is missing its typing.",
  consequence: "For clarity and interpretation please specify the typing for each field."
},
{
  name: "More than one Vital Tag",
  description: "There is more than one Vitale Tag associated to this dataset.",
  consequence: "Unexpected behavior might happen and disturb the criticity analysis."
},
{
  name: "More than one Personal Tag",
  description: "There is more than one Personal Tag associated to this dataset.",
  consequence: "Unexpected behavior might happen and disturb the criticity analysis."
},
{
  name: "More than one Strategic Tag",
  description: "There is more than one Strategic Tag associated to this dataset.",
  consequence: "Unexpected behavior might happen and disturb the criticity analysis."
},

]


const WarningInfo: FunctionComponent<DatasetInfoProps> = (props) => {
  const { datasetFields, facets, dataset, showTags, warnings } = props
  const theme = createTheme(useTheme())
  const i18next = require('i18next')
  

  return (
    <Box>
      {datasetFields.length === 0 && (
        <MqEmpty
          title={i18next.t('dataset_info.empty_title')}
          body={i18next.t('dataset_info.empty_body')}
        />
      )}
      {warnings && warnings.length > 0 && (
        <>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell align='center'>
                  <MqText subheading inline>
                    ICON
                  </MqText>
                </TableCell>
                  <TableCell align='center'>
                    <MqText subheading inline>
                      NAME
                    </MqText>
                  </TableCell>
                  <TableCell align='left'>
                    <MqText subheading inline>
                      {i18next.t('dataset_info_columns.description')}
                    </MqText>
                  </TableCell>
                  <TableCell align='left'>
                    <MqText subheading inline>
                      CONSEQUENCE
                    </MqText>
                  </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {warnings.map((warning, index) => {
                if (warning){
                  const warningElement = WarningsInfoList[index]
                  return (
                    <React.Fragment key={warningElement.name}>
                      <TableRow>
                        <TableCell align='center'>
                          <FontAwesomeIcon
                              aria-hidden={'true'}
                              title={'Warning'}
                              icon={faWarning}
                              width={16}
                              height={16}
                              color={theme.palette.warning.main}
                            />
                        </TableCell>
                        <TableCell align='center'>
                          <MqText font={'mono'}>{warningElement.name}</MqText>
                        </TableCell>
                        <TableCell align='left'>
                          <MqText subdued>{warningElement.description}</MqText>
                        </TableCell>
                        <TableCell align='left'>
                          <MqText subdued>{warningElement.consequence}</MqText>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                }
              })}
            </TableBody>
          </Table>
        </>
      )}
    </Box>
  )
}

export default WarningInfo
