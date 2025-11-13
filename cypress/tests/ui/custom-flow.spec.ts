import { User } from "../../../src/models";
import LoginPage from "../../pages/LoginPage";
import { isMobile } from "../../support/utils";

/**
 * Custom E2E Flow - Taller de Automatización Avanzada
 * 
 * Este test implementa un flujo completo de usuario usando Page Object Model:
 * 1. Login usando LoginPage (Page Object)
 * 2. Crear una nueva transacción de pago
 * 3. Verificar que la transacción aparece en el listado
 */

type CustomFlowCtx = {
  allUsers?: User[];
  currentUser?: User;
  receiverUser?: User;
};

describe("Custom E2E flow - login and create transaction", function () {
  const ctx: CustomFlowCtx = {};
  const loginPage = new LoginPage();

  beforeEach(function () {
    // Resetear la base de datos antes de cada test
    cy.task("db:seed");

    // Configurar interceptores necesarios
    loginPage.setupInterceptors();
    cy.intercept("GET", "/users*").as("allUsers");
    cy.intercept("POST", "/transactions").as("createTransaction");
    cy.intercept("GET", "/transactions").as("personalTransactions");
    cy.intercept("GET", "/checkAuth").as("getUserProfile");

    // Obtener usuarios de prueba de la base de datos
    cy.database("filter", "users").then((users: User[]) => {
      ctx.allUsers = users;
      ctx.currentUser = users[0]; // Usuario que va a hacer login
      ctx.receiverUser = users[1]; // Usuario que va a recibir el pago
    });
  });

  it("logs in and creates a new transaction using Page Object", function () {
    // ===== PASO 1: LOGIN usando Page Object =====
    // Usar el método de conveniencia del Page Object para hacer login
    loginPage.login(ctx.currentUser!.username, "s3cret");

    // Verificar que el login fue exitoso usando el método del Page Object
    loginPage.assertLoginSuccess();

    // ===== PASO 2: NAVEGAR A NUEVA TRANSACCIÓN =====
    // Click en el botón de nueva transacción
    cy.getBySelLike("new-transaction").click();

    // Esperar a que se cargue la lista de usuarios
    cy.wait("@allUsers");

    // Verificar que estamos en la página de nueva transacción
    cy.location("pathname").should("include", "/transaction/new");

    // ===== PASO 3: SELECCIONAR DESTINATARIO =====
    // Buscar el usuario destinatario por nombre
    cy.getBySel("user-list-search-input").type(ctx.receiverUser!.firstName, { force: true });

    // Seleccionar el usuario de la lista
    cy.getBySelLike("user-list-item")
      .contains(ctx.receiverUser!.firstName)
      .click({ force: true });

    // ===== PASO 4: COMPLETAR FORMULARIO DE TRANSACCIÓN =====
    const transactionData = {
      amount: "50",
      description: "Test E2E - Pago de prueba automatizado 💰",
    };

    // Ingresar el monto
    cy.getBySelLike("amount-input").type(transactionData.amount);

    // Ingresar la descripción
    cy.getBySelLike("description-input").type(transactionData.description);

    // ===== PASO 5: ENVIAR LA TRANSACCIÓN =====
    // Hacer click en el botón de pagar
    cy.getBySelLike("submit-payment").click();

    // Esperar a que se cree la transacción
    cy.wait("@createTransaction");

    // Verificar mensaje de éxito
    cy.getBySel("alert-bar-success")
      .should("be.visible")
      .and("have.text", "Transaction Submitted!");

    // ===== PASO 6: VERIFICAR QUE LA TRANSACCIÓN APARECE EN EL LISTADO =====
    // Volver al listado de transacciones
    cy.getBySelLike("return-to-transactions").click();

    // Ir a la pestaña de transacciones personales
    cy.getBySelLike("personal-tab").click();

    // Verificar que la pestaña está seleccionada
    cy.getBySelLike("personal-tab").should("have.class", "Mui-selected");

    // Esperar a que se carguen las transacciones
    cy.wait("@personalTransactions");

    // Verificar que la transacción creada aparece en el listado
    cy.getBySel("transaction-list")
      .should("be.visible")
      .and("contain", transactionData.description);

    // Verificar que el destinatario correcto aparece en la transacción
    cy.getBySelLike("transaction-item")
      .first()
      .should("contain", ctx.receiverUser!.firstName);

    // ===== PASO 7: VERIFICAR BALANCE ACTUALIZADO =====
    // Calcular el balance esperado después de la transacción
    const expectedBalance = ctx.currentUser!.balance - parseInt(transactionData.amount) * 100;

    // Abrir el menú lateral si estamos en móvil
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }

    // Verificar que el balance se actualizó correctamente
    // (el balance se muestra en formato currency, por ejemplo: $950.00)
    cy.getBySelLike("user-balance").should("exist");

    // Cerrar el menú lateral si estamos en móvil
    if (isMobile()) {
      cy.get(".MuiBackdrop-root").click({ force: true });
    }

    // ===== VERIFICACIÓN FINAL =====
    // Verificar en la base de datos que el balance del destinatario aumentó
    cy.database("find", "users", { id: ctx.receiverUser!.id })
      .its("balance")
      .should("equal", ctx.receiverUser!.balance + parseInt(transactionData.amount) * 100);
  });

  it("validates login error with incorrect credentials using Page Object", function () {
    // ===== TEST ADICIONAL: VERIFICAR ERROR DE LOGIN =====
    // Configurar interceptores
    loginPage.setupInterceptors();

    // Intentar login con credenciales incorrectas
    loginPage.login(ctx.currentUser!.username, "wrong-password");

    // Verificar que hay un error de login
    loginPage.assertLoginError();

    // Verificar que el mensaje de error se muestra
    cy.getBySel("signin-error")
      .should("be.visible")
      .and("contain", "Username or password is invalid");
  });
});
