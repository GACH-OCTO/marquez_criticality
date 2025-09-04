import { Dataset, DatasetId, Job, JobId, JobType, LineageGraph, Run } from "../../types/api";
import { LineageJob, LineageNode } from "../../types/lineage";
import { Tag } from "../../types/api";
import { WarningsInfoList } from "../datasets/WarningInfo";
import { extractCritTagNum, extractCritValues } from "../../routes/table-level/TableLineageDatasetNode";
import { Nullable } from "../../types/util/Nullable";

interface Crit {
  V_crit_level : number
  V_crit_desc : string
  S_crit_level : number
  S_crit_desc : string
  P_crit_level : number
  P_crit_desc : string
}

interface RetrievedJob{
  id: JobId
  type: JobType
  name: string
  simpleName: string
  parentJobName: Nullable<string>
  parentJobUuid: Nullable<string>
  createdAt: string
  updatedAt: string
  namespace: string
  inputs: DatasetId[]
  outputs: DatasetId[]
  location: string
  description: string
  latestRun: Run
  latestRuns: Run[]
  facets: object
  currentVersion: string
  labels: string[]
  tags: string[]
  
}

type LineageDictEntry = {
  element: Dataset | RetrievedJob;
  node: LineageNode;
};

type LineageDict = Record<string, LineageDictEntry>;


async function retrieveDatasetInfo(namespace: string, datasetName: string) {
  try {
    const encodedNamespace = encodeURIComponent(namespace);
    const encodedDatasetName = encodeURIComponent(datasetName);

    const response = await axios.get(
      //`http://localhost:1337/api/v1/namespaces/${encodedNamespace}/datasets/${encodedDatasetName}`,
      `http://localhost:3000/api/v1/namespaces/${encodedNamespace}/datasets/${encodedDatasetName}`,
      { headers: { 'Accept': 'application/json' } }
    );

    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération du dataset ${namespace}/${datasetName}:`, error);
    throw error;
  }
}

async function getLineage(namespace: string, entityName: string, type: 'dataset' | 'job', depth: number = 20) {
  // Construction du nodeId selon le type
  const nodeId = `${type}:${namespace}:${entityName}`;

  const encodedNodeId = encodeURIComponent(nodeId);
  const url = `http://localhost:3000/api/v1/lineage?nodeId=${encodedNodeId}&depth=${depth}`;

  try {
    const response = await axios.get(url, {
      headers: { 'Accept': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération de la lineage pour ${nodeId} :`, error);
    throw error;
  }
}


function extractCritLevel(tag: string): { type: 'V' | 'S' | 'P', level: number } | null {
  const match = tag.match(/^([VSP])(\d)$/);
  if (!match) return null;
  const [, type, levelStr] = match;
  return { type: type as 'V' | 'S' | 'P', level: parseInt(levelStr, 10) };
}

const axios = require('axios');
async function retrieveJob(jobNamespace:string, jobName : string) {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        //url: `http://localhost:1337/api/v1/namespaces/${jobNamespace}/jobs/${jobName}`,
        url: `http://localhost:3000/api/v1/namespaces/${jobNamespace}/jobs/${jobName}`,
        headers: {
            'Accept': 'application/json'
        }
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Erreur lors de la récupération des facets pour le job ${jobName}:`, error);
        throw error; 
    }
}


async function buildLineageDict(
  lineageNodeDataset: LineageNode[],
  lineageNodeJob: LineageNode[]
): Promise<LineageDict> {

  // Récupération des datasets
  const datasetEntries = lineageNodeDataset.map(async (node) => {
    const dataset = await retrieveDatasetInfo(node.data.namespace, node.data.name);
    return [node.id, { element: dataset, node }] as const;
  });

  // Récupération des jobs
  const jobEntries = lineageNodeJob.map(async (node) => {
    const nodeData = node.data as LineageJob;

    // Récupération du job complet depuis l'API
    const jobData: RetrievedJob = await retrieveJob(nodeData.namespace, nodeData.name);

    return [node.id, { element: jobData, node }] as const;
  });

  // Attente de toutes les promesses et transformation en dictionnaire
  const entries = await Promise.all([...datasetEntries, ...jobEntries]);
  return Object.fromEntries(entries);
}

function renderFacetsBlock(edgeId: string, element: Dataset | RetrievedJob) {
  if (!element) return '';

  if ('latestRun' in element) {
    const job = element as RetrievedJob;

    const jobFacetsHTML = job.facets
      ? `<details open>
          <summary style="cursor:pointer; font-weight:bold;">Job Facets</summary>
          <pre>${JSON.stringify(job.facets, null, 2)}</pre>
        </details>`
      : '';

    const latestRunFacetsHTML = job.latestRun?.facets
      ? `<details open>
          <summary style="cursor:pointer; font-weight:bold;">Latest Run Facets</summary>
          <pre>${JSON.stringify(job.latestRun.facets, null, 2)}</pre>
        </details>`
      : '';

    return `
      <div style="border:1px solid #ccc; border-radius:8px; padding:10px; margin-bottom:12px;">
        <h4>Job: ${edgeId}</h4>
        ${jobFacetsHTML}
        ${latestRunFacetsHTML}
      </div>
    `;
  } else {
    const dataset = element as Dataset
    return `
      <div style="border:1px solid #ccc; border-radius:8px; padding:10px; margin-bottom:12px;">
        <h4>Dataset: ${edgeId}</h4>
        <details open>
          <summary style="cursor:pointer; font-weight:bold;">Informations</summary>
          <pre>${JSON.stringify(dataset.facets, null, 2)}</pre>
        </details>
      </div>
    `;
  }
}

function traceAllPredecessors(nodeId: string, lineageDict: LineageDict, visited: Set<string> = new Set()): any {
  if (visited.has(nodeId)) return null;
  visited.add(nodeId);

  const entry = lineageDict[nodeId];
  if (!entry) return null;

  const node = entry.node;
  const data = entry.element;

  const predecessors = (node.inEdges ?? [])
    .map(e => traceAllPredecessors(e.origin, lineageDict, visited))
    .filter(Boolean);

  return {
    id: node.id,
    type: node.type,
    name: data.name || data.id?.name,
    namespace: data.id?.namespace || data.namespace,
    predecessors
  };
}

function traceAllSuccessors(nodeId: string, lineageDict: LineageDict, visited: Set<string> = new Set()): any {
  if (visited.has(nodeId)) return null;
  visited.add(nodeId);

  const entry = lineageDict[nodeId];
  if (!entry) return null;

  const node = entry.node;
  const data = entry.element;

  const successors = (node.outEdges ?? [])
    .map(e => traceAllSuccessors(e.destination, lineageDict, visited))
    .filter(Boolean);

  return {
    id: node.id,
    type: node.type,
    name: data.name || data.id?.name,
    namespace: data.id?.namespace || data.namespace,
    successors
  };
}

function renderLineageTree(node: any, direction: 'predecessors' | 'successors'): string {
  if (!node) return '';

  const typeColor = node.type === 'JOB' ? '#3498db' : '#2ecc71';
  const children = node[direction] || [];

  return `
    <li>
      <span style="font-weight:bold; color:${typeColor}">${node.type}</span> - 
      <span>${node.name}</span> 
      <small style="color:#888;">[${node.namespace}]</small>
      ${children.length ? `
        <ul>
          ${children.map((c: any) => renderLineageTree(c, direction)).join('')}
        </ul>
      ` : ''}
    </li>
  `;
}

function renderFacetsRecursive(
  node: any,
  lineageDict: LineageDict,
  direction: 'predecessors' | 'successors',
  distance: number = 0
): string {
  if (!node) return '';

  const entry = lineageDict[node.id];
  const element = entry?.element;

  const thisFacetsHTML = element
    ? `
      <div style="border:1px solid #aaa; border-radius:8px; padding:10px; margin-bottom:12px;">
        <h4>${node.type}: ${node.name}</h4>
        <p style="color:#555; font-size:14px;">Distance depuis dataset initial : <strong>${distance}</strong></p>
        ${renderFacetsBlock(node.id, element)}
      </div>
    `
    : '';

  const children = (node[direction] || [])
    .map((child: any) => renderFacetsRecursive(child, lineageDict, direction, distance + 1))
    .join('');

  return thisFacetsHTML + children;
}



export const downloadHTML = async (namespace: string, datasetName: string, tagData: Tag[], dataUrl: string) => {

  const lineageGraph: LineageGraph = await getLineage(namespace, datasetName, "dataset")
  const lineageNodeJob: LineageNode[] = lineageGraph.graph.filter(
    (node) => node.type === "JOB"
  );
  const lineageNodeDataset: LineageNode[] = lineageGraph.graph.filter(
    (node) => node.type === "DATASET"
  );
  
  const lineageDict: LineageDict = await buildLineageDict(lineageNodeDataset, lineageNodeJob);
  const lineageNode: LineageNode = lineageDict[`dataset:${namespace}:${datasetName}`].node
  const dataset = lineageDict[`dataset:${namespace}:${datasetName}`].element as Dataset
  const tracedPredecessors = traceAllPredecessors(`dataset:${namespace}:${datasetName}`, lineageDict);
  const tracedSuccessors = traceAllSuccessors(`dataset:${namespace}:${datasetName}`, lineageDict);
  const allPredecessorsFacetsHTML = renderFacetsRecursive(tracedPredecessors, lineageDict, 'predecessors');
  const allSuccessorsFacetsHTML = renderFacetsRecursive(tracedSuccessors, lineageDict, 'successors');


  const critInfo: Crit = {
  V_crit_level: 0,
  V_crit_desc: 'Non défini',
  P_crit_level: 0,
  P_crit_desc: 'Non défini',
  S_crit_level: 0,
  S_crit_desc: 'Non défini',
  };
  const nodeCriticity = dataset?.tags?.length ? extractCritValues(dataset.tags) : null;
  const warnings=[
                  !(nodeCriticity?.P_Crit && nodeCriticity?.S_Crit && nodeCriticity?.V_Crit), 
                  !(dataset?.description),
                  !(dataset?.fields?.every(field => !!field.description)),
                  !(dataset?.fields?.every(field => !!field.type)),
                  !!(extractCritTagNum(dataset?.tags, "V") > 1),
                  !!(extractCritTagNum(dataset?.tags, "P") > 1),
                  !!(extractCritTagNum(dataset?.tags, "S") > 1),
                ]
  try {
    const inEdgesFacetsHTML = (lineageNode?.inEdges ?? [])
      .map(edge => {
        const entry = lineageDict[edge.origin];
        if (!entry) return '';
        return renderFacetsBlock(edge.origin, entry.element);
      }).join('');

    const outEdgesFacetsHTML = (lineageNode?.outEdges ?? [])
      .map(edge => {
        const entry = lineageDict[edge.destination];
        if (!entry) return '';
        return renderFacetsBlock(edge.destination, entry.element);
      }).join('');



        const inEdgesHTML = (lineageNode?.inEdges ?? [])
          .map((edge) => `<li>Origine: ${edge.origin}</li>`)
          .join('');

        const outEdgesHTML = (lineageNode?.outEdges ?? [])
          .map((edge) => `<li>Destination: ${edge.destination}</li>`)
          .join('');
        
    
    dataset.tags.forEach((tag) => {
      const parsed = extractCritLevel(tag);
      if (!parsed) return;

      const description = tagData.find((t) => t.name === tag)?.description || 'Pas de description';

      switch (parsed.type) {
        case 'V':
          critInfo.V_crit_level = parsed.level;
          critInfo.V_crit_desc = description;
          break;
        case 'P':
          critInfo.P_crit_level = parsed.level;
          critInfo.P_crit_desc = description;
          break;
        case 'S':
          critInfo.S_crit_level = parsed.level;
          critInfo.S_crit_desc = description;
          break;
        
      }
    });

   const formattedTagsHTML = [
      {
        tag: `V${critInfo.V_crit_level}`,
        description: critInfo.V_crit_desc
      },
      {
        tag: `P${critInfo.P_crit_level}`,
        description: critInfo.P_crit_desc
      },
      {
        tag: `S${critInfo.S_crit_level}`,
        description: critInfo.S_crit_desc
      }
      
    ].map(({ tag, description }) => {
      return `<span 
                title="${description.replace(/"/g, '&quot;')}" 
                style="
                  display: inline-block; 
                  border: 1px solid #b53f3fff; 
                  color: #b53f3fff; 
                  padding: 6px 24px; 
                  border-radius: 16px; 
                  font-size: 34px; 
                  margin-right: 20px;
                  margin-bottom: 6px;
                  cursor: default;
                ">
                ${tag}
              </span>`;
    }).join('');

    const warningsHTML = warnings
  .map((warning, index) => {
    if (!warning) return null;
    const warningElement = WarningsInfoList[index];
    const icon = '⚠️'; // Warning
    const iconColor = '#f5a623'; // Jaune (warning)
    return `
      <tr>
        <td style="text-align: center; font-size: 16px; color: ${iconColor};">
          ${icon}
        </td>
        <td style="text-align: center;">
          <code style="font-weight: bold;">${warningElement.name}</code>
        </td>
        <td>
          <p style="margin: 4px 0; color: #666; font-weight: bold;">${warningElement.description}</p>
        </td>
        <td>
          <p style="margin: 4px 0; color: #666; font-weight: bold;">${warningElement.consequence}</p>
        </td>
      </tr>
    `;
  })
  .filter(Boolean) // Filtrer les entrées null
  .join('');

  const warningsSection = warnings.every(warning => !warning)
    ? '<div class="boxed-section"><p style="text-align: center; color: #4caf50; font-weight: bold;">✅ Tout est au vert !</p></div>'
    : `
      <div class="boxed-section">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: center;">Status</th>
              <th style="text-align: center;">Name</th>
              <th>Description</th>
              <th>Consequence</th>
            </tr>
          </thead>
          <tbody>
            ${warningsHTML}
          </tbody>
        </table>
      </div>
    `;


    // Générer le contenu HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Rapport - ${dataset.id.namespace}-${dataset.id.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #fff; color: #000; }
          h1 { text-align: center; }
          h2 { margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .boxed-section {
            background-color: #f2f2f2;
            border: 1px solid #ccc;
            border-radius: 10px;
            padding: 15px 20px;
            margin-top: 10px;
            max-width: 1500px;
          }
          .boxed-section p {
            margin: 5px 0;
          }
          .centered-boxed-section {
            background-color: #f2f2f2;
            border: 1px solid #ccc;
            border-radius: 10px;
            padding: 15px 20px;
            margin: 10px auto;        /* <-- centre horizontalement */
            max-width: 800px;
            text-align: center;       /* optionnel : centre le contenu à l'intérieur */
          }
          .centered-boxed-section p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <h1>RAPPORT</h1>

        <div class="centered-boxed-section">
          <h1></strong>${dataset.name}</h1>
          <p><strong>Description :</strong> ${dataset.description || 'N/A'}</p>
          <h1>${formattedTagsHTML}</h1>
        </div>

        <h2>Informations générales</h2>
        <details open>
        <summary style="cursor: pointer; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
            Métadonnées
          </summary>
          <div class="boxed-section">
            <p><strong>Namespace :</strong> ${dataset.id.namespace}</p>
            <p><strong>Nom technique :</strong> ${dataset.id.name}</p>
            <p><strong>Nom :</strong> ${dataset.name}</p>
            <p><strong>Description :</strong> ${dataset.description || 'N/A'}</p>
            <p><strong>Créé le :</strong> ${dataset.createdAt || 'Inconnu'}</p>
            <p><strong>Dernière modification:</strong> ${dataset.lastModifiedAt || 'Inconnu'}</p>
            <p><strong>Source :</strong> ${dataset.sourceName || 'Inconnu'}</p>
          </div>
        </details>
        
        <h2>Graphe de Lineage</h2>

        <details open>
          <summary style="cursor: pointer; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
            Voir le graphe
          </summary>
          <div class="image-section">
            <img 
              src="${dataUrl}" 
              alt="Lineage Graph" 
              style="border-radius: 10px; max-width: 100%; margin-top: 10px;" 
            />
          </div>
        </details>

        <h2>Tags</h2>
        <details closed>
        <summary style="cursor: pointer; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
            Info
          </summary>
          <div class="boxed-section">
            <p><strong>Nombre de tags :</strong> ${dataset.tags?.length || 0}</p>
            <p><strong>Tags :</strong></p>
          <div>${formattedTagsHTML}</div>
        </div>
        </details>

        <h2>Warnings</h2>
        <details open>
          ${warningsSection}
        </details>

        <h2>Lineage Progression</h2>
        <details open>
          <summary>Prédécesseurs complets</summary>
          <ul style="list-style-type:none; padding-left:20px;">
            ${renderLineageTree(tracedPredecessors, 'predecessors')}
          </ul>
        </details>

        <details open>
          <summary>Successeurs complets</summary>
          <ul style="list-style-type:none; padding-left:20px;">
            ${renderLineageTree(tracedSuccessors, 'successors')}
          </ul>
        </details>



            
        <h2>Recommendations</h2>
        <details open>
        <div class="boxed-section">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #000;">
            <h3 style="margin: 0;">Vitale :</h3>
            <span 
              title="${critInfo.V_crit_desc.replace(/"/g, '&quot;')}" 
              style="
                display: inline-block;
                border: 1px solid #b53f3fff;
                color: #b53f3fff;
                padding: 6px 24px;
                border-radius: 16px;
                font-size: 34px;
                cursor: default;
              ">
              ${critInfo.V_crit_level}
            </span>
          </div>
          <p style="margin: 4px 0; color: #666;}">${critInfo.V_crit_desc}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #000;">
            <h3 style="margin: 0;">Personnelle :</h3>
            <span 
              title="${critInfo.P_crit_desc.replace(/"/g, '&quot;')}" 
              style="
                display: inline-block;
                border: 1px solid #b53f3fff;
                color: #b53f3fff;
                padding: 6px 24px;
                border-radius: 16px;
                font-size: 34px;
                cursor: default;
              ">
              ${critInfo.P_crit_level}
            </span>
          </div>
          <p style="margin: 4px 0; color: #666;}">${critInfo.P_crit_desc}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #000;">
            <h3 style="margin: 0;">Stratégique :</h3>
            <span 
              title="${critInfo.S_crit_desc.replace(/"/g, '&quot;')}" 
              style="
                display: inline-block;
                border: 1px solid #b53f3fff;
                color: #b53f3fff;
                padding: 6px 24px;
                border-radius: 16px;
                font-size: 34px;
                cursor: default;
              ">
              ${critInfo.S_crit_level}
            </span>
          </div>
          <p style="margin: 4px 0; color: #666;}">${critInfo.S_crit_desc}</p>
        </div>
        </details>

        
        <h2>Facets</h2>
        <div class="boxed-section">
          <h3>Tous les prédécesseurs (facets)</h3>
          ${allPredecessorsFacetsHTML || '<p>Aucun prédécesseur</p>'}
        </div>
        <div class="boxed-section">
          <h3>Tous les successeurs (facets)</h3>
          ${allSuccessorsFacetsHTML || '<p>Aucun successeur</p>'}
        </div>


        <h2>Données liées</h2>

        <h3>Liens entrants (inEdges)</h3>
        <div class="boxed-section">
          <ul>${inEdgesHTML || '<li>Aucun lien entrant</li>'}</ul>
        </div>

        <h3>Liens sortants (outEdges)</h3>
        <div class="boxed-section">
          <ul>${outEdgesHTML || '<li>Aucun lien sortant</li>'}</ul>
        </div>


      </body>
      </html>
    `;

    // Création du blob HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Création et clic du lien pour téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${dataset.id.namespace}-${dataset.id.name}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erreur lors de la création du fichier HTML :', error);
  }
};
