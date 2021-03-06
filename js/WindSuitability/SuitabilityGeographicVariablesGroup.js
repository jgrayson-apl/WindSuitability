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
import SuitabilityWeightParameter from "./SuitabilityWeightParameter.js";

/**
 *
 * SuitabilityGroup
 *  - Suitability Group
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  1/4/2022 - 0.0.1 -
 * Modified:
 *
 * Used to control the Geographic Variables weighted overlay group.
 *
 */

class SuitabilityGeographicVariablesGroup extends HTMLElement {

  static version = '0.0.1';

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
  icon;

  /**
   *
   * @type {number}
   */
  weight;

  /**
   * @type {boolean}
   */
  disabled;


  /**
   *
   * @param {string} name
   * @param {string} label
   * @param {string} description
   * @param {string} icon
   * @param {number} weight
   * @param {boolean} disabled
   * @param {SuitabilitySource[]} sources
   */
  constructor({name, label, description, icon, weight, disabled, sources}) {
    super();

    this.name = (name || '');
    this.label = (label || '');
    this.description = (description || '');
    this.icon = (icon || 'information');
    this.weight = (weight || 5);
    this.disabled = (disabled || false);

    this.sources = (sources || []);

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
        
        .group-container[disabled]{
          user-select: none;
          pointer-events: none;
          opacity: 0.4;
        }
                        
      </style>
      <calcite-icon slot="icon" scale="s" icon="${ this.icon }"></calcite-icon>
      <div slot="control" class="weight-slider-container"></div>        
      <div class="group-container"></div>      
    `;

    // ATTACH CONTAINER TO SHADOW ROOT //
    this.attachShadow({mode: 'open'}).appendChild(this.container);
  }

  /**
   *
   */
  connectedCallback() {

    const groupContainer = this.shadowRoot.querySelector('.group-container');

    const weightSlider = new SuitabilityWeightParameter({min: 1, max: 9, weight: this.weight, widthScale: 's'});
    weightSlider.addEventListener('weight-input', () => {
      this.weight = weightSlider.weight;
    });
    weightSlider.addEventListener('weight-change', () => {
      this.dispatchEvent(new CustomEvent('parameters-change', {}));
    });
    weightSlider.addEventListener('disabled-change', () => {
      this.disabled = groupContainer.toggleAttribute('disabled', weightSlider.disabled);
      this.dispatchEvent(new CustomEvent('parameters-change', {}));
    });

    const weightSliderContainer = this.shadowRoot.querySelector('[slot="control"]');
    weightSliderContainer.append(weightSlider);

    this.suitabilitySources = this.sources.map(sourceParams => {

      const suitabilitySource = new SuitabilitySource(sourceParams);
      suitabilitySource.addEventListener('parameters-change', () => {
        this.dispatchEvent(new CustomEvent('parameters-change', {}));
      });

      return suitabilitySource;
    });

    groupContainer.append(...this.suitabilitySources);
  }

  /**
   *
   * @returns {Object}
   */
  getAnalysisParameters() {

    if (!this.disabled) {

      const {analysisParameters, names, totalWeight} = this.suitabilitySources.reduce((infos, suitabilitySource) => {

        if (!suitabilitySource.disabled) {
          const params = suitabilitySource.getAnalysisParameters();
          infos.analysisParameters = {...infos.analysisParameters, ...params};
          infos.names.push(suitabilitySource.name);
          infos.totalWeight += suitabilitySource.weight;
        }

        return infos;
      }, {analysisParameters: {}, names: [], totalWeight: 0});

      if (names.length) {

        analysisParameters['Calc_Expression_1'] = `((${ names.join(' + ') })/${ totalWeight })`;
        analysisParameters[`Weight_${ this.name }`] = this.weight;

        return analysisParameters;
      } else { return null;}
    } else { return null; }

  }

}

customElements.define('suitability-group-geo', SuitabilityGeographicVariablesGroup);

export default SuitabilityGeographicVariablesGroup;
