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

import SuitabilityWeightParameter from "./SuitabilityWeightParameter.js";
import SuitabilityInputParameter from "./SuitabilityInputParameter.js";

/**
 *
 * SuitabilitySource
 *  - Suitability Source
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  12/30/2021 - 0.0.1 -
 * Modified:
 *
 */

class SuitabilitySource extends HTMLElement {

  static version = '0.0.1';

  /**
   *
   * @type {string}
   */
  zeroRaster;

  /**
   *
   * @type {string}
   */
  id;

  /**
   *
   * @type {string}
   */
  name;

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
  type;

  /**
   *
   * @type {number}
   */
  factor;

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
   * @type {number}
   */
  defaultWeight;

  /**
   *
   * @type {Object[]}
   */
  inputInfos;

  /**
   *
   * @type {Object[]}
   */
  categoryInfos;

  /**
   *
   * @type {SuitabilityWeightParameter[]}
   */
  sourceParameters;

  /**
   * @type {boolean}
   */
  disabled;

  /**
   *
   * @param {number} zeroRaster
   * @param {number} id
   * @param {string} name
   * @param {string} label
   * @param {string} description
   * @param {string} type
   * @param {number} factor
   * @param {string} icon
   * @param {number} weight
   * @param {boolean} disabled
   * @param {[]} inputInfos
   * @param {[]} categoryInfos
   */
  constructor({zeroRaster, id, name, label, description, type, factor, icon, weight, disabled= false, inputInfos = [], categoryInfos = []}) {
    super();

    this.zeroRaster = `$${ zeroRaster }`;

    this.id = id ? `$${ id }` : null;
    this.name = (name || '');
    this.label = (label || '');
    this.description = (description || '');
    this.type = (type || 'numeric');
    this.factor = (factor || 1.0);
    this.icon = (icon || 'information');
    this.weight = this.defaultWeight = (weight || 5);

    this.disabled = disabled;

    this.inputInfos = inputInfos;
    this.categoryInfos = categoryInfos;

    this.container = document.createElement('calcite-block');
    this.container.setAttribute('heading', this.label);
    this.container.setAttribute('summary', this.description);
    this.container.toggleAttribute('collapsible', true);
    this.container.innerHTML = `      
      <style>
        /*@import "https://js.arcgis.com/calcite-components/1.0.0-beta.69/calcite.css";*/
        
        [slot="control"] {
          width: 150px;
          margin: auto;
        }
        
        .parameters-container[disabled]{
          user-select: none;
          pointer-events: none;
          opacity: 0.4;
        }
                        
      </style>
      <calcite-icon slot="icon" scale="s" icon="${ this.icon }"></calcite-icon>
      <div slot="control" class="weight-slider-container"></div>
      <div class="parameters-container"></div>      
    `;

    // <suitability-weight-parameter min="1" max="9" weight="${ this.weight }" source-type="${ this.type }" source-factor="${ this.factor }"></suitability-weight-parameter>
    //<calcite-slider className="weight-slider" min="0" max="9" value="${ this.weight }" ticks="3" snap label-handles></calcite-slider>

    // ATTACH CONTAINER TO SHADOW ROOT //
    this.attachShadow({mode: 'open'}).appendChild(this.container);
  }

  /**
   *
   */
  connectedCallback() {

    const parametersContainer = this.shadowRoot.querySelector('.parameters-container');
    parametersContainer.toggleAttribute('disabled', this.disabled);

    const weightSlider = new SuitabilityWeightParameter({min: 1, max: 9, weight: this.weight, widthScale: 's', disabled: this.disabled});
    weightSlider.addEventListener('weight-input', () => {
      this.weight = weightSlider.weight;
    });
    weightSlider.addEventListener('weight-change', () => {
      this.dispatchEvent(new CustomEvent('parameters-change', {}));
    });
    weightSlider.addEventListener('disabled-change', () => {
      this.disabled = parametersContainer.toggleAttribute('disabled', weightSlider.disabled);
      this.dispatchEvent(new CustomEvent('parameters-change', {}));
    });

    const weightSliderContainer = this.shadowRoot.querySelector('[slot="control"]');
    weightSliderContainer.append(weightSlider);


    // CREATE INPUT PARAMETERS //
    const inputParameters = this.inputInfos.map(inputInfo => {
      const inputParameter = new SuitabilityInputParameter(inputInfo);
      inputParameter.addEventListener('weight-change', ({}) => {
        this.dispatchEvent(new CustomEvent('parameters-change', {}));
      });

      return inputParameter;
    });
    parametersContainer.append(...inputParameters);

    // CREATE CATEGORY PARAMETERS //
    this.sourceParameters = this.categoryInfos.map(categoryInfo => {

      const label = this._getParameterLabel(categoryInfo);

      const weightParameter = new SuitabilityWeightParameter({...categoryInfo, canDisable: false, label});
      weightParameter.addEventListener('weight-change', ({}) => {
        this.dispatchEvent(new CustomEvent('parameters-change', {}));
      });
      weightParameter.addEventListener('disabled-change', () => {
        this.dispatchEvent(new CustomEvent('parameters-change', {}));
      });

      return weightParameter;
    });

    //this.sourceParameters = [...inputParameters, ...categoryParameters];

    parametersContainer.append(...this.sourceParameters);
  }

  /**
   *
   * @param value
   * @returns {string}
   * @private
   */
  _getLabelValue(value) {
    let label;
    switch (this.type) {
      case 'numeric':
        label = `${ (value / this.factor).toLocaleString() }`;
        break;
      case 'percent':
        label = `${ value }%`;
        break;
      default:
        label = value;
    }
    return label;
  }

  /**
   *
   * @param {Object} parameterInfo
   * @returns {string}
   * @private
   */
  _getParameterLabel(parameterInfo) {

    let label;

    if (parameterInfo.min == null) {
      label = `less than ${ this._getLabelValue(parameterInfo.max) }`;
    } else {
      if (parameterInfo.max == null) {
        label = `greater than ${ this._getLabelValue(parameterInfo.min) }`;
      } else {
        switch (this.type) {
          case 'numeric':
          case 'percent':
            label = [parameterInfo.min, parameterInfo.max].map(v => this._getLabelValue(v)).join(' to ');
            break;
          default:
            label = [parameterInfo.min, parameterInfo.max].map(v => this._getLabelValue(v)).join(' ');
        }
      }
    }

    return label;
  }

  /**
   *
   */
  getAnalysisParameters(totalWeights) {

    const analysisParameters = {};

    if (!this.id) { return analysisParameters; }

    if (this.disabled) {

      analysisParameters[this.name] = this.zeroRaster;
      analysisParameters[`Weight_${ this.name }`] = 0.0;
      analysisParameters[`InputRanges_${ this.name }`] = [0, 1];
      analysisParameters[`OutputValues_${ this.name }`] = [0];

    } else {

      const {inputRanges, outputValues, noDataRanges} = this.sourceParameters.reduce((infos, sourceParameter) => {
        if (sourceParameter.disabled) {
          infos.noDataRanges.push([sourceParameter.min, sourceParameter.max]);
        } else {
          infos.inputRanges.push([sourceParameter.min, sourceParameter.max]);
          infos.outputValues.push(sourceParameter.weight);
        }
        return infos;
      }, {inputRanges: [], outputValues: [], noDataRanges: []});

      analysisParameters[this.name] = this.id;
      analysisParameters[`Weight_${ this.name }`] = (totalWeights != null) ? (this.weight / totalWeights) : this.weight;
      analysisParameters[`InputRanges_${ this.name }`] = inputRanges;
      analysisParameters[`OutputValues_${ this.name }`] = outputValues;
      //noDataRanges.length && (analysisParameters[`NoDataRanges_${ this.name }`] = noDataRanges);

    }

    return analysisParameters;
  }

  /**
   *
   */
  reset() {
    this.sourceParameters.forEach(sourceParameter => { sourceParameter.reset();});
    this.dispatchEvent(new CustomEvent('parameters-change', {}));
  }

}

customElements.define('suitability-source', SuitabilitySource);

export default SuitabilitySource;
