/*
 Copyright 2021 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import SuitabilitySource from "./SuitabilitySource.js";
import SuitabilityInputParameter from "./SuitabilityInputParameter.js";

/**
 *
 * SuitabilityIRRGroup
 *  - Suitability IRR Group
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  1/5/2022 - 0.0.1 -
 * Modified:
 *
 * Used to control the Investment Rate of Return (IRR) weighted overlay group.
 *
 */

class SuitabilityIRRGroup extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {InvestmentRateOfReturnService}
   */
  irrService;

  /**
   *
   * @type {number}
   */
  zeroRaster;

  /**
   *
   * @type {string}
   */
  label;

  /**
   *
   * @type {string}
   */
  description;

  /**
   *
   * @type {string}
   */
  icon;

  /**
   *
   * @type {number}
   */
  weight;

  /**
   *
   * @param {InvestmentRateOfReturnService} irrService
   * @param {number} zeroRaster
   * @param {string} label
   * @param {string} description
   * @param {string} icon
   * @param {number} weight
   * @param {string} inputLabel
   * @param {string} outputLabel
   * @param {SuitabilityInputParameter[]} inputInfos
   * @param {{InputRanges,OutputValues}} remap
   * @param {SuitabilitySource[]} sources
   */
  constructor({irrService, zeroRaster, label, description, icon, weight, inputLabel, outputLabel, inputInfos, remap, sources}) {
    super();

    this.irrService = irrService;
    this.zeroRaster = zeroRaster;

    this.label = (label || '');
    this.description = (description || '');
    this.icon = (icon || 'information');
    this.weight = (weight || 5);

    this.inputLabel = (inputLabel || '');
    this.outputLabel = (outputLabel || '');

    this.inputInfos = (inputInfos || []);
    this.remap = (remap || {InputRanges: [], OutputValues: []});
    this.sources = (sources || []);

    this.container = document.createElement('calcite-block');
    this.container.setAttribute('heading', this.label);
    this.container.setAttribute('summary', this.description);
    this.container.toggleAttribute('collapsible', true);
    this.container.innerHTML = `      
      <style>
        /*@import "https://js.arcgis.com/calcite-components/1.0.0-beta.69/calcite.css";*/
              
                       
        .inputs-panel {
          margin: 3px;
          padding: 8px;
          background-color: #f8f8f8;
          border: solid 1px #dedede;
        }
        
        .zones-container[disabled],
        .sources-container[disabled] {
          user-select: none;
          pointer-events: none;
          opacity: 0.4;
        }        
                
        .rates-by-region-table {
          margin: 0 10% 0 10%;
          width: calc(100% - 20%);
        }
        
        .rates-by-region-table tr {
          text-align: center;   
        }     
        
        .rates-by-region-table th {
          border-bottom: solid 2px #ededed;
        }
        
        .rates-by-region-table td {
          border-bottom: solid 1px #ededed;              
        }
                                
        .field-id {
          width: 100px;                 
        }
        
        .field-value {
          width: calc(100% - 100px);          
        }
                        
      </style>
      <calcite-icon slot="icon" scale="s" icon="${ this.icon }"></calcite-icon>
      <calcite-block-section text="${ this.inputLabel }">
        <div class="inputs-panel">
          <div class="zones-container"></div>        
          <div class="leader-s trailer-s">
            <calcite-button class="power-price-btn" alignment="center" appearance="outline" color="blue" icon-end="play-f" width="full" round>Call IRR Service</calcite-button>
          </div>
        </div>      
      </calcite-block-section>
      <calcite-block-section text="${ this.outputLabel }">       
        <table class="rates-by-region-table">
          <thead>
          <tr>
            <th class="field-id">Region</th>
            <th class="field-value">Rate</th>
          </tr>
          </thead>
          <tbody class="regions-rates-list"></tbody>
        </table>       
      </calcite-block-section>
      <div class="sources-container"></div>      
    `;

    // ATTACH CONTAINER TO SHADOW ROOT //
    this.attachShadow({mode: 'open'}).appendChild(this.container);

  }

  /**
   *
   */
  connectedCallback() {

    // CREATE INPUT PARAMETERS //
    this.inputParameters = this.inputInfos.map(inputInfo => {
      const inputParameter = new SuitabilityInputParameter(inputInfo);
      inputParameter.addEventListener('weight-change', ({}) => {
        this.dispatchEvent(new CustomEvent('parameters-change', {}));
      });
      return inputParameter;
    });
    const zonesContainer = this.shadowRoot.querySelector('.zones-container');
    zonesContainer.append(...this.inputParameters);


    // SUITABILITY SOURCES //
    this.suitabilitySources = this.sources.map(sourceParams => {

      const suitabilitySource = new SuitabilitySource({zeroRaster: this.zeroRaster, ...sourceParams});
      suitabilitySource.addEventListener('parameters-change', () => {
        this.dispatchEvent(new CustomEvent('parameters-change', {}));
      });
      suitabilitySource.addEventListener('disabled-change', () => {
        this.disabled = suitabilitySource.disabled;
        this.dispatchEvent(new CustomEvent('parameters-change', {}));
      });

      return suitabilitySource;
    });
    const sourcesContainer = this.shadowRoot.querySelector('.sources-container');
    sourcesContainer.append(...this.suitabilitySources);


    // RATES BY REGION
    const regionsRatesList = this.shadowRoot.querySelector('.regions-rates-list');
    const updateRegionsList = () => {
      // DISPLAY LIST OF NEW REGION RATES //
      const regionRatesRows = this.remap.OutputValues.map((outputValue, outputValueIdx) => {
        const regionId = this.remap.InputRanges[outputValueIdx * 2];
        return `<tr><td>${ regionId }</td><td>${ outputValue }%</td></tr>`
      });
      regionsRatesList.innerHTML = regionRatesRows.join('');
    };

    // CALL IRR SERVICE //
    const callIRRService = () => {
      return new Promise((resolve, reject) => {

        // POWER PRICE SERVICE INPUTS //
        const powerPriceInputs = this.inputParameters.reduce((inputs, inputParameter) => {
          inputs[inputParameter.name] = inputParameter.value;
          return inputs;
        }, {});

        // GET RATES BY REGION //
        console.info('Parameters for calling IIR Service: ', powerPriceInputs);
        this.irrService.getRatesByRegion(powerPriceInputs).then(({irrValues}) => {
          console.info('Results of calling IIR Service: ', irrValues);

          this.remap.OutputValues = irrValues;
          resolve();
        });
      });
    }
    this.irrService.load().then(() => {
      callIRRService().then(updateRegionsList);
    });

    // CALL POWER PRICE SERVICE //
    const powerPriceBtn = this.shadowRoot.querySelector('.power-price-btn');
    powerPriceBtn.addEventListener('click', () => {
      powerPriceBtn.toggleAttribute('loading', true);
      callIRRService().then(() => {
        powerPriceBtn.toggleAttribute('loading', false);
        updateRegionsList();
        this.dispatchEvent(new CustomEvent('parameters-change', {}));
      });
    });
  }

  /**
   *
   * @param {number} totalGroupWeights
   * @returns {Object}
   */
  getAnalysisParameters(totalGroupWeights) {
    if (this.disabled) {
      return {};

    } else {

      const regionRemapParameters = {}
      regionRemapParameters[`InputRanges_${ this.remap.name }`] = this.remap.InputRanges;
      regionRemapParameters[`OutputValues_${ this.remap.name }`] = this.remap.OutputValues;

      const analysisParameters = this.suitabilitySources.reduce((params, suitabilitySource) => {
        return {...params, ...suitabilitySource.getAnalysisParameters(totalGroupWeights)};
      }, {});

      analysisParameters[`irr_zones`] = analysisParameters.irr;
      delete analysisParameters.irr;

      return {...regionRemapParameters, ...analysisParameters};
    }
  }

}

customElements.define('suitability-group-irr', SuitabilityIRRGroup);

export default SuitabilityIRRGroup;
