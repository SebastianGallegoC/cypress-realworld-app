/**
 * LoginPage - Page Object Model para la página de Login
 * 
 * Este Page Object encapsula los selectores y acciones relacionadas
 * con el proceso de autenticación en la aplicación.
 */

class LoginPage {
  /**
   * Navega a la página de inicio/signin
   */
  visit() {
    cy.visit('/signin');
  }

  /**
   * Escribe el nombre de usuario en el campo correspondiente
   * @param {string} username - Nombre de usuario
   */
  fillUsername(username) {
    cy.getBySel('signin-username').type(username);
  }

  /**
   * Escribe la contraseña en el campo correspondiente
   * @param {string} password - Contraseña
   */
  fillPassword(password) {
    cy.getBySel('signin-password').type(password);
  }

  /**
   * Marca o desmarca el checkbox "Remember Me"
   * @param {boolean} remember - Si se debe recordar el usuario
   */
  checkRememberMe(remember = true) {
    if (remember) {
      cy.getBySel('signin-remember-me').find('input').check();
    }
  }

  /**
   * Hace click en el botón de submit para iniciar sesión
   */
  submit() {
    cy.getBySel('signin-submit').click();
  }

  /**
   * Método de conveniencia que realiza el flujo completo de login
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña
   * @param {boolean} rememberUser - Si se debe recordar el usuario
   */
  login(username, password, rememberUser = false) {
    this.visit();
    this.fillUsername(username);
    this.fillPassword(password);
    if (rememberUser) {
      this.checkRememberMe(true);
    }
    this.submit();
  }

  /**
   * Verifica que el login fue exitoso comprobando que se muestra
   * la lista de transacciones (elemento que indica home/dashboard)
   */
  assertLoginSuccess() {
    // Espera a que se complete la petición de login
    cy.wait('@loginUser');
    // Verifica que el skeleton desaparece (carga completa)
    cy.getBySel('list-skeleton').should('not.exist');
    // Verifica que estamos en la página principal
    cy.location('pathname').should('equal', '/');
  }

  /**
   * Verifica que hay un error en el login
   * (útil para tests de credenciales incorrectas)
   */
  assertLoginError() {
    // Verifica que seguimos en la página de signin
    cy.location('pathname').should('include', '/signin');
    // Opcionalmente, verifica mensajes de error si existen
    // cy.getBySel('signin-error').should('be.visible');
  }

  /**
   * Configura los interceptores necesarios para el login
   * (llamar en beforeEach de los tests)
   */
  setupInterceptors() {
    cy.intercept('POST', '/login').as('loginUser');
    cy.intercept('GET', '/checkAuth').as('getUserProfile');
  }
}

export default LoginPage;
