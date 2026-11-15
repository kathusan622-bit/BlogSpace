
// =====================================
// BACKEND API CONFIGURATION
// =====================================

const API_URL = "http://localhost:5000/api";

const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=60";

// =====================================
// AUTHENTICATION HELPERS
// =====================================

const getToken = () => localStorage.getItem("token");

const getCurrentUser = () =>
  JSON.parse(localStorage.getItem("currentUser") || "null");

const saveCurrentUser = (user) =>
  localStorage.setItem("currentUser", JSON.stringify(user));

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// =====================================
// API REQUEST HELPER
// =====================================

async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (getToken()) {
    headers.Authorization = "Bearer " + getToken();
  }

  const response = await fetch(API_URL + endpoint, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// =====================================
// HTML HELPER
// =====================================

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function showMessage(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = "message " + type;
}

const catClass = (c) =>
  "cat-" + String(c || "General").toLowerCase().replace(/[^a-z]/g, "");

// =====================================
// NAVBAR
// =====================================

function setupNavbar() {
  const toggle = document.getElementById("menuToggle");
  const links = document.getElementById("navLinks");

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
    });
  }

  const authArea = document.getElementById("authLinks");
  if (!authArea) return;

  const user = getCurrentUser();

  if (user) {
    authArea.innerHTML = `
      <li><a href="dashboard.html">Dashboard</a></li>
      <li><a href="#" id="logoutLink">Logout (${escapeHTML(user.name)})</a></li>
    `;

    document.getElementById("logoutLink").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });

  } else {
    authArea.innerHTML = `
      <li><a href="login.html">Login</a></li>
      <li><a href="register.html" class="nav-cta">Register</a></li>
    `;
  }
}

// =====================================
// GET ALL BLOGS
// =====================================

async function fetchBlogs() {
  const data = await apiRequest("/blogs");
  return data.blogs || [];
}

// =====================================
// HOME PAGE
// =====================================

async function loadHome() {
  const grid = document.getElementById("blogGrid");
  if (!grid) return;

  grid.innerHTML = '<p class="empty">Loading blogs...</p>';

  try {
    const blogs = await fetchBlogs();
    const filterBox = document.getElementById("filters");

    let active = "All";

    function render() {
      const list = active === "All"
        ? blogs
        : blogs.filter((b) => b.category === active);

      if (list.length === 0) {
        grid.innerHTML = `
          <p class="empty">
            No blogs in this category yet.
            <a href="create-blog.html">Write the first one.</a>
          </p>
        `;
        return;
      }

      grid.innerHTML = list.map((b) => {
        const author = b.author?.name || "Unknown";
        const date = b.createdAt
          ? new Date(b.createdAt).toISOString().slice(0, 10)
          : "";

        return `
          <article class="card ${catClass(b.category)}">
            <div class="card-img">
              <img
                src="${escapeHTML(b.image || DEFAULT_IMG)}"
                alt="${escapeHTML(b.title)}"
                onerror="this.src='${DEFAULT_IMG}'"
              />
            </div>

            <div class="card-body">
              <span class="tag">${escapeHTML(b.category)}</span>
              <h3>${escapeHTML(b.title)}</h3>

              <p>
                ${escapeHTML(
                  (b.content || "").length > 110
                    ? b.content.slice(0, 110) + "..."
                    : b.content
                )}
              </p>

              <div class="meta">
                <span class="avatar">
                  ${escapeHTML(author.charAt(0).toUpperCase())}
                </span>
                ${escapeHTML(author)} on ${escapeHTML(date)}
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    if (filterBox) {
      const cats = [
        "All",
        ...new Set(blogs.map((b) => b.category).filter(Boolean))
      ];

      filterBox.innerHTML = cats.map((c) => `
        <button
          class="filter${c === "All" ? " active" : ""}"
          data-cat="${escapeHTML(c)}"
        >
          ${escapeHTML(c)}
        </button>
      `).join("");

      filterBox.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter");
        if (!btn) return;

        active = btn.dataset.cat;

        filterBox.querySelectorAll(".filter").forEach((f) => {
          f.classList.toggle("active", f === btn);
        });

        render();
      });
    }

    render();

  } catch (err) {
    grid.innerHTML = `
      <p class="empty">
        Failed to load blogs: ${escapeHTML(err.message)}
      </p>
    `;
  }
}

// =====================================
// REGISTER
// =====================================

function setupRegister() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const msg = document.getElementById("message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.elements.namedItem("name").value.trim();
    const email = form.elements.namedItem("email").value.trim().toLowerCase();
    const password = form.elements.namedItem("password").value;
    const confirm = form.elements.namedItem("confirm").value;

    if (!name || !email || !password || !confirm) {
      return showMessage(msg, "Please fill in all fields.", "error");
    }

    if (password.length < 6) {
      return showMessage(msg, "Password must be at least 6 characters.", "error");
    }

    if (password !== confirm) {
      return showMessage(msg, "Passwords do not match.", "error");
    }

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });

      showMessage(
        msg,
        data.message || "Registration successful! Redirecting...",
        "success"
      );

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

// =====================================
// LOGIN
// =====================================

function setupLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const msg = document.getElementById("message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.elements.namedItem("email").value.trim().toLowerCase();
    const password = form.elements.namedItem("password").value;

    if (!email || !password) {
      return showMessage(msg, "Please enter email and password.", "error");
    }

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem("token", data.token);
      saveCurrentUser(data.user);

      window.location.href = "dashboard.html";

    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

// =====================================
// DASHBOARD
// =====================================

async function loadDashboard() {
  const body = document.getElementById("blogTableBody");
  if (!body) return;

  const user = getCurrentUser();

  if (!user || !getToken()) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("welcome").textContent =
    "Welcome, " + user.name + "!";

  body.innerHTML = `
    <tr><td colspan="4">Loading blogs...</td></tr>
  `;

  try {
    const all = await fetchBlogs();

    const mine = all.filter((b) =>
      b.author && b.author._id === user.id
    );

    document.getElementById("statMine").textContent = mine.length;
    document.getElementById("statAll").textContent = all.length;

    document.getElementById("statCats").textContent =
      new Set(mine.map((b) => b.category)).size;

    if (mine.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="4" class="empty">
            You have not published any blogs yet.
            <a href="create-blog.html">Write your first blog.</a>
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = mine.map((b) => {
      const date = b.createdAt
        ? new Date(b.createdAt).toISOString().slice(0, 10)
        : "";

      return `
        <tr>
          <td>${escapeHTML(b.title)}</td>
          <td>
            <span class="tag ${catClass(b.category)}">
              ${escapeHTML(b.category)}
            </span>
          </td>
          <td>${escapeHTML(date)}</td>
          <td>
            <button
              class="btn btn-sm"
              onclick="editBlog('${b._id}')"
            >
              Edit
            </button>

            <button
              class="btn btn-danger btn-sm"
              onclick="deleteBlog('${b._id}')"
            >
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    body.innerHTML = `
      <tr>
        <td colspan="4">${escapeHTML(err.message)}</td>
      </tr>
    `;
  }
}

// =====================================
// EDIT BLOG
// =====================================

async function editBlog(id) {
  try {
    const data = await apiRequest(
      "/blogs/" + encodeURIComponent(id)
    );

    const blog = data.blog;

    const title = prompt("Edit Blog Title:", blog.title);
    if (title === null) return;

    const category = prompt("Edit Blog Category:", blog.category);
    if (category === null) return;

    const content = prompt("Edit Blog Content:", blog.content);
    if (content === null) return;

    const image = prompt("Edit Image URL:", blog.image || "");
    if (image === null) return;

    if (!title.trim() || !category.trim() || !content.trim()) {
      alert("Title, category and content are required.");
      return;
    }

    if (content.trim().length < 20) {
      alert("Content must be at least 20 characters.");
      return;
    }

    const result = await apiRequest(
      "/blogs/" + encodeURIComponent(id),
      {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          content: content.trim(),
          image: image.trim()
        })
      }
    );

    alert(result.message || "Blog updated successfully!");

    await loadDashboard();

  } catch (err) {
    alert(err.message);
  }
}

window.editBlog = editBlog;

// =====================================
// DELETE BLOG
// =====================================

async function deleteBlog(id) {
  if (!confirm("Delete this blog?")) return;

  try {
    const data = await apiRequest("/blogs/" + encodeURIComponent(id), {
      method: "DELETE"
    });

    alert(data.message || "Blog deleted successfully");

    await loadDashboard();

  } catch (err) {
    alert(err.message);
  }
}

window.deleteBlog = deleteBlog;

// =====================================
// CREATE BLOG
// =====================================

function setupCreateBlog() {
  const form = document.getElementById("blogForm");
  if (!form) return;

  const user = getCurrentUser();

  if (!user || !getToken()) {
    window.location.href = "login.html";
    return;
  }

  const msg = document.getElementById("message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = form.elements.namedItem("title").value.trim();
    const category = form.elements.namedItem("category").value;
    const image = form.elements.namedItem("image").value.trim();
    const content = form.elements.namedItem("content").value.trim();

    if (!title || !category || !content) {
      return showMessage(
        msg,
        "Title, category and content are required.",
        "error"
      );
    }

    if (content.length < 20) {
      return showMessage(
        msg,
        "Content must be at least 20 characters.",
        "error"
      );
    }

    try {
      const data = await apiRequest("/blogs", {
        method: "POST",
        body: JSON.stringify({
          title,
          category,
          image,
          content
        })
      });

      showMessage(
        msg,
        data.message || "Blog published successfully!",
        "success"
      );

      form.reset();

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);

    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

// =====================================
// INITIALIZE
// =====================================

document.addEventListener("DOMContentLoaded", () => {
  setupNavbar();
  loadHome();
  setupRegister();
  setupLogin();
  loadDashboard();
  setupCreateBlog();

  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }
});
