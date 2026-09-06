function mostrarErro(idElemento, mensagem) {
  const el = document.getElementById(idElemento);
  el.textContent = mensagem;
  el.style.display = "block";
}

function limparErro(idElemento) {
  const el = document.getElementById(idElemento);
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

function mostrarTela(idTela) {
  const telas = ["tela-login", "tela-esqueci-senha", "app-principal"];
  telas.forEach((id) => {
    const el = document.getElementById(id);
    el.style.display = id === idTela ? (id === "app-principal" ? "block" : "flex") : "none";
  });
}

async function iniciarAutenticacao() {
  await aguardarFirebasePronto();

  const { auth, onAuthStateChanged, signOut, sendPasswordResetEmail, deleteUser } = window.firebaseAuth;

  const inputEmail = document.getElementById("login-email");
  const inputSenha = document.getElementById("login-senha");
  const inputCodigoConvite = document.getElementById("login-codigo-convite");
  const btnLogin = document.getElementById("btn-login");
  const btnCadastrar = document.getElementById("btn-cadastrar");
  const btnSair = document.getElementById("btn-sair");
  const btnEsqueciSenha = document.getElementById("btn-esqueci-senha");
  const carregando = document.getElementById("login-carregando");

  const inputEsqueciEmail = document.getElementById("esqueci-email");
  const btnEnviarRecuperacao = document.getElementById("btn-enviar-recuperacao");
  const btnVoltarLogin = document.getElementById("btn-voltar-login");
  const carregandoEsqueci = document.getElementById("esqueci-carregando");

  function definirCarregandoLogin(ativo) {
    carregando.style.display = ativo ? "block" : "none";
    btnLogin.disabled = ativo;
    btnCadastrar.disabled = ativo;
  }

  function definirCarregandoEsqueci(ativo) {
    carregandoEsqueci.style.display = ativo ? "block" : "none";
    btnEnviarRecuperacao.disabled = ativo;
  }

  btnLogin.addEventListener("click", async () => {
    limparErro("login-erro");
    const email = inputEmail.value.trim();
    const senha = inputSenha.value;

    if (!email || !senha) {
      mostrarErro("login-erro", "Preencha e-mail e senha.");
      return;
    }

    definirCarregandoLogin(true);
    try {
      await window.firebaseAuth.signInWithEmailAndPassword(auth, email, senha);
    } catch (erro) {
      mostrarErro("login-erro", traduzirErroFirebase(erro.code));
    } finally {
      definirCarregandoLogin(false);
    }
  });

  btnCadastrar.addEventListener("click", async () => {
    limparErro("login-erro");
    const email = inputEmail.value.trim();
    const senha = inputSenha.value;
    const codigoConvite = inputCodigoConvite.value.trim();

    if (!email || !senha) {
      mostrarErro("login-erro", "Preencha e-mail e senha.");
      return;
    }
    if (senha.length < 6) {
      mostrarErro("login-erro", "A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (!codigoConvite) {
      mostrarErro("login-erro", "Digite o código de convite para criar uma conta.");
      return;
    }

    definirCarregandoLogin(true);
    let credencial = null;
    try {
      credencial = await window.firebaseAuth.createUserWithEmailAndPassword(auth, email, senha);

      // A gravação abaixo só é aceita pelo Firestore se o código de convite
      // for válido (checagem real acontece nas regras de segurança do banco).
      const { db, doc, setDoc } = window.firebaseDb;
      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        registros: {},
        perfil: null,
        meta: 2000,
        agua: {},
        codigoConviteUsado: codigoConvite,
      });
    } catch (erro) {
      if (erro.code === "permission-denied") {
        mostrarErro("login-erro", "Código de convite inválido.");
      } else {
        mostrarErro("login-erro", traduzirErroFirebase(erro.code));
      }
      // Se o código estiver errado, desfaz a conta criada para não deixar lixo
      // no Authentication sem acesso nenhum ao app.
      if (credencial && credencial.user) {
        await deleteUser(credencial.user).catch(() => {});
      }
    } finally {
      definirCarregandoLogin(false);
    }
  });

  btnSair.addEventListener("click", async () => {
    await signOut(auth);
  });

  btnEsqueciSenha.addEventListener("click", () => {
    limparErro("login-erro");
    limparErro("esqueci-erro");
    document.getElementById("esqueci-sucesso").style.display = "none";
    inputEsqueciEmail.value = inputEmail.value.trim();
    mostrarTela("tela-esqueci-senha");
  });

  btnVoltarLogin.addEventListener("click", () => {
    mostrarTela("tela-login");
  });

  btnEnviarRecuperacao.addEventListener("click", async () => {
    limparErro("esqueci-erro");
    document.getElementById("esqueci-sucesso").style.display = "none";

    const email = inputEsqueciEmail.value.trim();
    if (!email) {
      mostrarErro("esqueci-erro", "Digite seu e-mail.");
      return;
    }

    definirCarregandoEsqueci(true);
    try {
      await sendPasswordResetEmail(auth, email);
      mostrarSucessoRecuperacao();
    } catch (erro) {
      // Não revela se o e-mail existe ou não na base (evita enumeração de contas).
      if (erro.code === "auth/user-not-found") {
        mostrarSucessoRecuperacao();
      } else {
        mostrarErro("esqueci-erro", traduzirErroFirebase(erro.code));
      }
    } finally {
      definirCarregandoEsqueci(false);
    }
  });

  function mostrarSucessoRecuperacao() {
    const sucesso = document.getElementById("esqueci-sucesso");
    sucesso.textContent = "Se esse e-mail estiver cadastrado, você vai receber um link para redefinir a senha. Confira também o spam.";
    sucesso.style.display = "block";
  }

  function liberarAcessoAoApp(usuario) {
    mostrarTela("app-principal");
    window.usuarioAtual = usuario;
    document.dispatchEvent(new CustomEvent("usuario-logado", { detail: usuario }));
  }

  onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
      liberarAcessoAoApp(usuario);
    } else {
      mostrarTela("tela-login");
      window.usuarioAtual = null;
      inputEmail.value = "";
      inputSenha.value = "";
      limparErro("login-erro");
    }
  });
}

iniciarAutenticacao();
