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

/**
 *
 * SuitabilityInputParameter
 *  - Suitability Input Parameter
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  1/4/2022 - 0.0.1 -
 * Modified:
 *
 */

class SuitabilityInputParameter extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type SuitabilitySource
   */
  source;

  /**
   *
   * @type {string}
   */
  type;

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
  suffix;

  /**
   *
   * @type {number}
   */
  min;

  /**
   *
   * @type {number}
   */
  max;

  /**
   *
   * @type {number}
   */
  defaultValue;

  /**
   *
   * @type {number}
   */
  value;

  /**
   *
   * @param {string} type
   * @param {string} name
   * @param {string} label
   * @param {string} suffix
   * @param {number} min
   * @param {number} max
   * @param {number} value
   */
  constructor({type, name, label, suffix, min, max, value}) {
    super();

    this.type = type || 'number';
    this.name = name || '';
    this.label = label || '';
    this.suffix = suffix || '';
    this.min = min || 0;
    this.max = max || 100;
    this.value = this.defaultValue = (value || 50);

    this.container = document.createElement('calcite-label');
    this.container.setAttribute('layout', 'inline');
    this.container.innerHTML = `      
      <style>
        /*/@import "https://js.arcgis.com/calcite-components/1.0.0-beta.69/calcite.css";*/      
        
        .parameter-label{
          font-size: 9pt;
          text-align: right;
          width: 200px;
        }
        
        .parameter-input[invalid] {
          background: none;
          box-shadow: none;
        }
        
      </style>
      <div class="parameter-label">${ this.label }</div>
      <calcite-input class="parameter-input" type="${ this.type }" alignment="end" suffix-text="${ this.suffix }" min="${ this.min }" max="${ this.max }" value="${ this.value }"></calcite-input>      
    `;

    // ATTACH CONTAINER TO SHADOW ROOT //
    this.attachShadow({mode: 'open'}).appendChild(this.container);
  }

  /**
   *
   */
  connectedCallback() {

    // VALUE INPUT //
    this.parameterInput = this.shadowRoot.querySelector('.parameter-input');
    this.parameterInput.addEventListener('calciteInputChange', () => {
      this.value = this.parameterInput.value;
      this.dispatchEvent(new CustomEvent('value-change', {}));
    });

  }

  /**
   *
   */
  reset() {
    this.parameterSlider.value = this.defaultWeight;
    this.dispatchEvent(new CustomEvent('weight-change', {}));
  }

}

customElements.define('suitability-input-parameter', SuitabilityInputParameter);

export default SuitabilityInputParameter;
