/// <reference types="cypress" />

import Repeater from './Repeater.vue'
import { mount } from 'cypress-vue-unit-test'

describe('Repeater', () => {
  it('User can type and see output on the screen', () => {
    mount(Repeater)
    cy.get('#item').type('Cypress')
    cy.contains('You typed: Cypress')
  })
})
