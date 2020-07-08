/// <reference types="cypress" />

import TranslatedMessage from './TranslatedMessage.vue'
import VueI18n from 'vue-i18n'
import { mountCallback } from 'cypress-vue-unit-test'

describe('VueI18n', () => {
  // need to use VueI18n as a plugin
  const extensions = {
    plugins: [VueI18n],
    components: {
      TranslatedMessage,
    },
  }

  const template = '<translated-message />'

  beforeEach(mountCallback({ template }, { extensions }))

  it('shows English, Japanese and Russian greeting', () => {
    cy.viewport(400, 200)

    cy.get('select').select('en').should('have.value', 'en')
    // wait for good demo movie
    cy.contains('message: hello').wait(1000)

    cy.get('select').select('fa').should('have.value', 'fa')
    cy.contains('message: سلام دنیا').wait(1000)

    cy.get('select').select('ja').should('have.value', 'ja')
    cy.contains('message: こんにちは、世界').wait(1000)

    cy.get('select').select('ru').should('have.value', 'ru')
    cy.contains('message: Привет мир').wait(1000)
  })

  // TODO how to load messages not from i18n block but from external JSON file?
  // then we could reuse the messages to check the contents
})
