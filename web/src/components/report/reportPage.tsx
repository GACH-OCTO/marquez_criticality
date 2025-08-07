import { Dataset } from "../../types/api";
import { LineageDataset, LineageNode } from "../../types/lineage";
import { Tag } from "../../types/api";
import { WarningsInfoList } from "../datasets/WarningInfo";
import { extractCritTagNum, extractCritValues } from "../../routes/table-level/TableLineageDatasetNode";
import { fetchJobFacets } from "../../store/actionCreators";

interface Crit {
  V_crit_level : number
  V_crit_desc : string
  S_crit_level : number
  S_crit_desc : string
  P_crit_level : number
  P_crit_desc : string
}

function extractCritLevel(tag: string): { type: 'V' | 'S' | 'P', level: number } | null {
  const match = tag.match(/^([VSP])(\d)$/);
  if (!match) return null;
  const [, type, levelStr] = match;
  return { type: type as 'V' | 'S' | 'P', level: parseInt(levelStr, 10) };
}

const axios = require('axios');
async function retrieveJobFacets(runId : string) {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `http://localhost:5000/api/v1/jobs/runs/${runId}/facets`,
        headers: {
            'Accept': 'application/json'
        }
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Erreur lors de la récupération des facets pour le runId ${runId}:`, error);
        throw error; 
    }
}

interface FacetsDictionary {
  [key: string]: any; // Replace 'any' with a more specific type if you know the structure of the facets data
}

async function createJobFacetsDictionary(ids: string[]) {
    const facetsDictionary : FacetsDictionary = {};

    // Utiliser une boucle for...of pour itérer sur chaque runId
    for (const runId of ids) {
        try {
            // Appeler fetchJobFacets pour chaque runId et attendre la réponse
            const facets = await retrieveJobFacets(runId);
            // Stocker le résultat dans le dictionnaire avec runId comme clé
            facetsDictionary[runId] = facets;
        } catch (error) {
            console.error(`Erreur lors de la récupération des facets pour le runId ${runId}:`, error);
            facetsDictionary[runId] = null;
        }
    }

    return facetsDictionary;
}

export const downloadHTML = async (dataset: Dataset, lineageDataset: LineageDataset, tagData: Tag[], lineageNode: LineageNode, dataUrl: string) => {

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
    //const InEdgesJob: string[] = lineageNode.inEdges.map(edge => edge.origin.slice(8));
    const InEdgesJob = ["019832cf-496b-7d74-a02f-d2ef7395a380"]
    const InEdgesJobDict = await createJobFacetsDictionary(InEdgesJob)
    const OutEdgesJob: string[] = lineageNode.outEdges.map(edge => edge.destination);
    const OutEdgesJobDict = await createJobFacetsDictionary(OutEdgesJob)


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

    const warningsHTML = warnings.map((warning, index) => {
        const warningElement = WarningsInfoList[index]

        const icon = warning
          ? '⚠️' // Warning
          : '✅' // Check

        const iconColor = warning
          ? '#f5a623' // Jaune (warning)
          : '#4caf50' // Vert (valid)

        return `
          <tr>
            <td style="text-align: center; font-size: 16px; color: ${iconColor};">
              ${icon}
            </td>
            <td style="text-align: center;">
              <code style="${warning ? 'font-weight: bold;' : ''}">${warningElement.name}</code>
            </td>
            <td>
              <p style="margin: 4px 0; color: #666; ${warning ? 'font-weight: bold;' : ''}">${warningElement.description}</p>
            </td>
            <td>
              <p style="margin: 4px 0; color: #666; ${warning ? 'font-weight: bold;' : ''}">${warningElement.consequence}</p>
            </td>
          </tr>
        `
      })
      .join('')

    const inEdgesFacetsHTML = Object.entries(InEdgesJobDict).map(([jobId, facets]) => `
      <div>
        <h4>Job ID: ${jobId}</h4>
        <pre>${JSON.stringify(facets, null, 2)}</pre>
      </div>
    `).join('');

    const outEdgesFacetsHTML = Object.entries(OutEdgesJobDict).map(([jobId, facets]) => `
      <div>
        <h4>Job ID: ${jobId}</h4>
        <pre>${JSON.stringify(facets, null, 2)}</pre>
      </div>
    `).join('');

    const inEdgesHTML = lineageNode.inEdges.map(
      (edge) => `<li>Origine: ${edge.origin}</li>`
    ).join('')

    const outEdgesHTML = lineageNode.outEdges.map(
      (edge) => `<li>Destination: ${edge.destination}</li>`
    ).join('')

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
            <h3>In Edges Job Facets</h3>
            ${inEdgesFacetsHTML}
          </div>
          <div class="boxed-section">
            <h3>Out Edges Job Facets</h3>
            ${outEdgesFacetsHTML}
          </div>

        <h2>Données liées</h2>
        

        <h3>Liens entrants (inEdges)</h3>
        <div class="boxed-section">
        <ul>${inEdgesHTML || '<li>Aucun lien entrant</li>'}</ul>
        </div>
        <h3 >Liens sortants (outEdges)</h3>
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
