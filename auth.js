function mostrarErroLogin(mensagem) {
  const el = document.getElementById("login-erro");
  el.textContent = mensagem;
  el.style.display = "block";
}

function limparErroLogin() {
  const el = document.getElementById("login-erro");
  el.style.display = "none";
  el.textContent = "";
}

function traduzirErroFirebase(codigo) {
  const mapa = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Não existe conta com esse e-mail.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/missing-password": "Digite uma senha.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
  };
  return mapa[codigo] || "Não foi possível completar a operação. Tente novamente.";
}

function aguardarFirebasePronto() {
  return new Promise((resolve) => {
    const verificar = () => {
      if (window.firebaseAuth && window.firebaseDb) {
        resolve();
      } else {
        setTimeout(verificar, 50);
      }
    };
    verificar();
  });
}

async function iniciarAutenticacao() {
  await aguardarFirebasePronto();

  const { auth, onAuthStateChanged, signOut } = window.firebaseAuth;

  const inputEmail = document.getElementById("login-email");
  const inputSenha = document.getElementById("login-senha");
  const btnLogin = document.getElementById("btn-login");
  const btnCadastrar = document.getElementById("btn-cadastrar");
  const btnSair = document.getElementById("btn-sair");
  const carregando = document.getElementById("login-carregando");

  function definirCarregando(ativo) {
    carregando.style.display = ativo ? "block" : "none";
    btnLogin.disabled = ativo;
    btnCadastrar.disabled = ativo;
  }

  btnLogin.addEventListener("click", async () => {
    limparErroLogin();
    const email = inputEmail.value.trim();
    const senha = inputSenha.value;

    if (!email || !senha) {
      mostrarErroLogin("Preencha e-mail e senha.");
      return;
    }

    definirCarregando(true);
    try {
      await window.firebaseAuth.signInWithEmailAndPassword(auth, email, senha);
    } catch (erro) {
      mostrarErroLogin(traduzirErroFirebase(erro.code));
    } finally {
      definirCarregando(false);
    }
  });

  btnCadastrar.addEventListener("click", async () => {
    limparErroLogin();
    const email = inputEmail.value.trim();
    const senha = inputSenha.value;

    if (!email || !senha) {
      mostrarErroLogin("Preencha e-mail e senha.");
      return;
    }
    if (senha.length < 6) {
      mostrarErroLogin("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    definirCarregando(true);
    try {
      await window.firebaseAuth.createUserWithEmailAndPassword(auth, email, senha);
    } catch (erro) {
      mostrarErroLogin(traduzirErroFirebase(erro.code));
    } finally {
      definirCarregando(false);
    }
  });

  btnSair.addEventListener("click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, (usuario) => {
    const telaLogin = document.getElementById("tela-login");
    const appPrincipal = document.getElementById("app-principal");

    if (usuario) {
      telaLogin.style.display = "none";
      appPrincipal.style.display = "block";
      window.usuarioAtual = usuario;
      document.dispatchEvent(new CustomEvent("usuario-logado", { detail: usuario }));
    } else {
      telaLogin.style.display = "flex";
      appPrincipal.style.display = "none";
      window.usuarioAtual = null;
      inputEmail.value = "";
      inputSenha.value = "";
      limparErroLogin();
    }
  });
}

iniciarAutenticacao();
