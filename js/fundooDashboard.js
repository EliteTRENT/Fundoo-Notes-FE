document.addEventListener("DOMContentLoaded", function () {
    const noteInitialInput = document.getElementById("noteInitialInput");
    const noteTitleInput = document.getElementById("noteTitleInput");
    const noteInput = document.getElementById("noteInput");
    const closeNoteButton = document.getElementById("closeNoteButton");
    const notesGrid = document.querySelector(".fundoo-dash-notes-grid");
    const modalNoteTitle = document.getElementById("modalNoteTitle");
    const modalNoteContent = document.getElementById("modalNoteContent");
    const noteModal = new bootstrap.Modal(document.getElementById("noteModal"));
    const jwtToken = localStorage.getItem("jwtToken");
    const userName = localStorage.getItem("userName");
    const userEmail = localStorage.getItem("userEmail");
    const profileButton = document.getElementById("profileButton");
    const profileDropdown = document.getElementById("profileDropdown");
    const hamburger = document.getElementById("hamburger");
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("mainContent");
    const headerTitle = document.getElementById("headerTitle");
    let currentView = "notes";
    let allNotes = [];

    if (!jwtToken) {
        alert("You must be logged in to create and view notes.");
        return;
    }

    if (userName) document.getElementById("profileName").textContent = `Hi, ${userName}`;
    if (userEmail) {
        document.getElementById("profileEmail").textContent = userEmail;
        const emailInitial = userEmail.charAt(0).toUpperCase();
        document.getElementById("profileButton").textContent = emailInitial;
        document.getElementById("profileAvatar").textContent = emailInitial;
    }

    // Toggle dropdown on button click
    profileButton.addEventListener("click", function (event) {
        event.stopPropagation();
        profileDropdown.style.display = profileDropdown.style.display === "block" ? "none" : "block";
    });

    // Hide dropdown when clicking outside
    document.addEventListener("click", function (event) {
        if (!profileDropdown.contains(event.target) && event.target !== profileButton) {
            profileDropdown.style.display = "none";
        }
    });

    // Logout
    document.getElementById("logoutButton").addEventListener("click", function () {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        window.location.href = "../pages/fundooLogin.html";
    });

    // Sidebar Navigation Event Listeners
    const notesTab = document.getElementById("notesTab");
    const archiveTab = document.getElementById("archiveTab");
    const trashTab = document.getElementById("trashTab");

    if (notesTab) notesTab.addEventListener("click", () => switchView("notes"));
    if (archiveTab) archiveTab.addEventListener("click", () => switchView("archive"));
    if (trashTab) trashTab.addEventListener("click", () => switchView("trash"));

    // Hamburger Menu Toggle
    if (hamburger && sidebar && mainContent) {
        hamburger.addEventListener("click", function (event) {
            event.stopPropagation();
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                sidebar.classList.toggle("expanded");
                sidebar.classList.toggle("collapsed");
                mainContent.classList.toggle("sidebar-expanded");
            } else {
                sidebar.classList.toggle("collapsed");
            }
        });

        document.addEventListener("click", function (event) {
            const isMobile = window.innerWidth <= 768;
            if (isMobile && !sidebar.contains(event.target) && !hamburger.contains(event.target) && sidebar.classList.contains("expanded")) {
                sidebar.classList.remove("expanded");
                sidebar.classList.add("collapsed");
                mainContent.classList.remove("sidebar-expanded");
            }
        });

        window.addEventListener("resize", function () {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile && sidebar.classList.contains("expanded")) {
                sidebar.classList.remove("expanded");
                sidebar.classList.add("collapsed");
                mainContent.classList.remove("sidebar-expanded");
            }
        });
    }

    // Note Creation Expansion
    noteInitialInput.addEventListener("click", function () {
        if (currentView === "notes") {
            noteInitialInput.style.display = "none";
            document.querySelector(".note-expanded").style.display = "block";
            noteTitleInput.focus();
        }
    });

    closeNoteButton.addEventListener("click", function (e) {
        e.preventDefault();
        const title = noteTitleInput.value.trim();
        const content = noteInput.value.trim();
        if (title || content) saveNote(title, content);
        noteTitleInput.value = "";
        noteInput.value = "";
        document.querySelector(".note-expanded").style.display = "none";
        noteInitialInput.style.display = "block";
    });

    // Focus on search input when search icon is clicked
    const searchIcon = document.querySelector(".fundoo-dash-search i");
    if (searchIcon) {
        searchIcon.addEventListener("click", function () {
            document.getElementById("searchInput").focus();
        });
    }

    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function switchView(view) {
        currentView = view;
        fetchNotesWithSearch();

        const createNoteSection = document.querySelector(".fundoo-dash-create-note");
        if (currentView === "notes") {
            createNoteSection.style.display = "block";
        } else {
            createNoteSection.style.display = "none";
        }

        document.querySelectorAll(".fundoo-dash-sidebar li").forEach(tab => {
            tab.classList.remove("active");
        });

        const tabElement = document.getElementById(`${view}Tab`);
        if (tabElement) tabElement.classList.add("active");

        headerTitle.textContent = view === "notes" ? "Fundoo" : view === "archive" ? "Archive" : "Bin";
        document.body.classList.remove("notes-active", "archive-active", "trash-active");
        document.body.classList.add(`${view}-active`);

        if (window.innerWidth <= 768) {
            sidebar.classList.remove("expanded");
            sidebar.classList.add("collapsed");
            mainContent.classList.remove("sidebar-expanded");
        }
    }

    function fetchNotesWithSearch() {
        fetch("http://localhost:3000/api/v1/notes/getNote", {
            method: "GET",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(data => {
            if (!data.notes || !Array.isArray(data.notes)) {
                console.error("Invalid API response format:", data);
                data.notes = [];
            }
            allNotes = data.notes;
            filterAndDisplayNotes(document.getElementById("searchInput").value.trim());
        })
        .catch(error => console.error("Fetch Error:", error));
    }

    function filterAndDisplayNotes(query) {
        notesGrid.innerHTML = "";
        const lowerQuery = query.toLowerCase();
        let added = false;

        allNotes.forEach(note => {
            const title = (note.title || "").toLowerCase();
            const content = (note.content || "").toLowerCase();
            const matchesSearch = title.includes(lowerQuery) || content.includes(lowerQuery);

            if (note.isDeleted && currentView === "trash" && matchesSearch) {
                addNoteToUI(note.id, note.title, note.content, note.color);
                added = true;
            } else if (note.isArchive && !note.isDeleted && currentView === "archive" && matchesSearch) {
                addNoteToUI(note.id, note.title, note.content, note.color);
                added = true;
            } else if (!note.isArchive && !note.isDeleted && currentView === "notes" && matchesSearch) {
                addNoteToUI(note.id, note.title, note.content, note.color);
                added = true;
            }
        });

        if (!added) {
            notesGrid.innerHTML = "<p>No matching notes found.</p>";
        }
    }

    function handleSearch(query) {
        filterAndDisplayNotes(query);
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        const debouncedSearchHandler = debounce((e) => {
            handleSearch(e.target.value.trim());
        }, 500);
        searchInput.addEventListener("input", debouncedSearchHandler);
    }

    function saveNote(title, content) {
        fetch("http://localhost:3000/api/v1/notes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ title, content })
        })
        .then(response => response.json())
        .then(data => {
            if (data.note) {
                addNoteToUI(data.note.id, data.note.title || "", data.note.content || "", data.note.color || "white");
                noteTitleInput.value = "";
                noteInput.value = "";
                fetchNotesWithSearch();
            } else {
                console.error("Error:", data.errors);
            }
        })
        .catch(error => console.error("Request Failed:", error));
    }

    function addNoteToUI(id, title, content, colour = "white") {
        const noteDiv = document.createElement("div");
        noteDiv.classList.add("fundoo-dash-note");
        noteDiv.dataset.id = id;
        noteDiv.style.backgroundColor = colour;

        let iconsHTML = "";
        if (currentView === "notes") {
            iconsHTML = `
                <i class="fas fa-box-archive archive-icon" title="Archive"></i>
                <i class="fas fa-trash delete-icon" title="Move to Trash"></i>
                <i class="fas fa-palette colour-icon" title="Change Colour"></i>
            `;
        } else if (currentView === "archive") {
            iconsHTML = `
                <i class="fas fa-folder-open unarchive-icon" title="Unarchive"></i>
                <i class="fas fa-trash delete-icon" title="Move to Trash"></i>
                <i class="fas fa-palette colour-icon" title="Change Colour"></i>
            `;
        } else if (currentView === "trash") {
            iconsHTML = `
                <i class="fas fa-undo restore-icon" title="Restore"></i>
                <i class="fas fa-trash-alt delete-permanent-icon" title="Delete Permanently"></i>
                <i class="fas fa-palette colour-icon" title="Change Colour"></i>
            `;
        }

        noteDiv.innerHTML = `
            <h3>${title || ""}</h3>
            <p>${content || ""}</p>
            <div class="note-icons">${iconsHTML}</div>
        `;

        noteDiv.addEventListener("click", function (event) {
            if (event.target.classList.contains("archive-icon") || 
                event.target.classList.contains("delete-icon") || 
                event.target.classList.contains("unarchive-icon") || 
                event.target.classList.contains("restore-icon") || 
                event.target.classList.contains("delete-permanent-icon") || 
                event.target.classList.contains("colour-icon")) return;

            modalNoteTitle.value = noteDiv.querySelector("h3").textContent;
            modalNoteContent.value = noteDiv.querySelector("p").textContent;
            const noteColor = noteDiv.style.backgroundColor || "white";
            document.querySelector(".modal-content.fundoo-dash-note").style.backgroundColor = noteColor;

            const modalIcons = document.querySelector(".modal-icons");
            modalIcons.innerHTML = "";

            if (currentView === "notes") {
                modalIcons.innerHTML = `
                    <i class="fas fa-box-archive archive-icon" title="Archive"></i>
                    <i class="fas fa-trash delete-icon" title="Move to Trash"></i>
                    <i class="fas fa-palette colour-icon" title="Change Colour"></i>
                `;
                modalIcons.querySelector(".archive-icon").addEventListener("click", () => toggleArchive(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".delete-icon").addEventListener("click", () => toggleTrash(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".colour-icon").addEventListener("click", () => openColourPicker(id, noteDiv));
            } else if (currentView === "archive") {
                modalIcons.innerHTML = `
                    <i class="fas fa-folder-open unarchive-icon" title="Unarchive"></i>
                    <i class="fas fa-trash delete-icon" title="Move to Trash"></i>
                    <i class="fas fa-palette colour-icon" title="Change Colour"></i>
                `;
                modalIcons.querySelector(".unarchive-icon").addEventListener("click", () => toggleArchive(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".delete-icon").addEventListener("click", () => toggleTrash(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".colour-icon").addEventListener("click", () => openColourPicker(id, noteDiv));
            } else if (currentView === "trash") {
                modalIcons.innerHTML = `
                    <i class="fas fa-undo restore-icon" title="Restore"></i>
                    <i class="fas fa-trash-alt delete-permanent-icon" title="Delete Permanently"></i>
                    <i class="fas fa-palette colour-icon" title="Change Colour"></i>
                `;
                modalIcons.querySelector(".restore-icon").addEventListener("click", () => toggleTrash(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".delete-permanent-icon").addEventListener("click", () => deleteNote(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".colour-icon").addEventListener("click", () => openColourPicker(id, noteDiv));
            }

            noteModal.show();

            noteModal._element.addEventListener('hidden.bs.modal', function () {
                const updatedTitle = modalNoteTitle.value.trim();
                const updatedContent = modalNoteContent.value.trim();
                if (updatedTitle !== noteDiv.querySelector("h3").textContent || updatedContent !== noteDiv.querySelector("p").textContent) {
                    updateNote(id, updatedTitle, updatedContent, noteDiv);
                }
                document.querySelector(".modal-content.fundoo-dash-note").style.backgroundColor = "white";
            }, { once: true });
        });

        if (currentView === "notes") {
            const archiveIcon = noteDiv.querySelector(".archive-icon");
            const deleteIcon = noteDiv.querySelector(".delete-icon");
            const colourIcon = noteDiv.querySelector(".colour-icon");
            if (archiveIcon) archiveIcon.addEventListener("click", () => toggleArchive(id));
            if (deleteIcon) deleteIcon.addEventListener("click", () => toggleTrash(id));
            if (colourIcon) colourIcon.addEventListener("click", () => openColourPicker(id, noteDiv));
        } else if (currentView === "archive") {
            const unarchiveIcon = noteDiv.querySelector(".unarchive-icon");
            const deleteIcon = noteDiv.querySelector(".delete-icon");
            const colourIcon = noteDiv.querySelector(".colour-icon");
            if (unarchiveIcon) unarchiveIcon.addEventListener("click", () => toggleArchive(id));
            if (deleteIcon) deleteIcon.addEventListener("click", () => toggleTrash(id));
            if (colourIcon) colourIcon.addEventListener("click", () => openColourPicker(id, noteDiv));
        } else if (currentView === "trash") {
            const restoreIcon = noteDiv.querySelector(".restore-icon");
            const deletePermanentIcon = noteDiv.querySelector(".delete-permanent-icon");
            const colourIcon = noteDiv.querySelector(".colour-icon");
            if (restoreIcon) restoreIcon.addEventListener("click", () => toggleTrash(id));
            if (deletePermanentIcon) deletePermanentIcon.addEventListener("click", () => deleteNote(id));
            if (colourIcon) colourIcon.addEventListener("click", () => openColourPicker(id, noteDiv));
        }

        notesGrid.prepend(noteDiv);
    }

    function toggleArchive(id) {
        return fetch(`http://localhost:3000/api/v1/notes/archiveToggle/${id}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(() => fetchNotesWithSearch())
        .catch(error => console.error("Error:", error));
    }

    function toggleTrash(id) {
        return fetch(`http://localhost:3000/api/v1/notes/trashToggle/${id}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(() => fetchNotesWithSearch())
        .catch(error => console.error("Error:", error));
    }

    function deleteNote(id) {
        return fetch(`http://localhost:3000/api/v1/notes/delete/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(() => fetchNotesWithSearch())
        .catch(error => console.error("Error:", error));
    }

    function updateNote(id, title, content, noteElement) {
        fetch(`http://localhost:3000/api/v1/notes/updateNote/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`
            },
            body: JSON.stringify({note:{ title, content }})
        })
        .then(response => response.json())
        .then(data => {
            if (data.note) {
                noteElement.querySelector("h3").textContent = data.note.title || "";
                noteElement.querySelector("p").textContent = data.note.content || "";
                modalNoteTitle.value = data.note.title || "";
                modalNoteContent.value = data.note.content || "";
                fetchNotesWithSearch();
            } else {
                console.error("Error updating note:", data.errors);
            }
        })
        .catch(error => console.error("Request Failed:", error));
    }

    function openColourPicker(noteId, noteElement) {
        const colorPicker = document.createElement("div");
        colorPicker.classList.add("color-picker-popup");
        colorPicker.style.position = "absolute";
        colorPicker.style.zIndex = "1000";
        colorPicker.style.background = "#fff";
        colorPicker.style.borderRadius = "8px";
        colorPicker.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        colorPicker.style.padding = "10px";
        colorPicker.style.display = "grid";
        colorPicker.style.gridTemplateColumns = "repeat(5, 30px)";
        colorPicker.style.gap = "5px";

        const colors = [
            "#f28b82", "#fbbc04", "#fff475", "#ccff90", "#a7ffeb",
            "#cbf0f8", "#aecbfa", "#d7aefb", "#fdcfe8", "#e6c9a8",
            "#e8eaed"
        ];

        colors.forEach(color => {
            const colorCircle = document.createElement("div");
            colorCircle.style.width = "30px";
            colorCircle.style.height = "30px";
            colorCircle.style.borderRadius = "50%";
            colorCircle.style.backgroundColor = color;
            colorCircle.style.cursor = "pointer";
            colorCircle.style.border = "2px solid #fff";
            colorCircle.addEventListener("click", () => {
                updateNoteColour(noteId, color, noteElement);
                document.body.removeChild(colorPicker);
            });
            colorCircle.addEventListener("mouseover", () => {
                colorCircle.style.borderColor = "#ddd";
            });
            colorCircle.addEventListener("mouseout", () => {
                colorCircle.style.borderColor = "#fff";
            });
            colorPicker.appendChild(colorCircle);
        });

        const closeButton = document.createElement("div");
        closeButton.textContent = "×";
        closeButton.style.position = "absolute";
        closeButton.style.top = "5px";
        closeButton.style.right = "5px";
        closeButton.style.fontSize = "18px";
        closeButton.style.cursor = "pointer";
        closeButton.addEventListener("click", () => {
            document.body.removeChild(colorPicker);
        });
        colorPicker.appendChild(closeButton);

        const rect = noteElement.getBoundingClientRect();
        colorPicker.style.top = `${rect.bottom + window.scrollY + 5}px`;
        colorPicker.style.left = `${rect.left + window.scrollX}px`;

        document.body.appendChild(colorPicker);

        document.addEventListener("click", function handleOutsideClick(event) {
            if (!colorPicker.contains(event.target) && event.target !== noteElement.querySelector(".colour-icon")) {
                document.body.removeChild(colorPicker);
                document.removeEventListener("click", handleOutsideClick);
            }
        });
    }

    function updateNoteColour(noteId, colour, noteElement) {
        fetch(`http://localhost:3000/api/v1/notes/changeColor/${noteId}/${encodeURIComponent(colour)}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${jwtToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                noteElement.style.backgroundColor = colour;
                if (noteModal._isShown) {
                    document.querySelector(".modal-content.fundoo-dash-note").style.backgroundColor = colour;
                }
                fetchNotesWithSearch();
            } else {
                console.error("Error:", data.errors);
            }
        })
        .catch(error => console.error("Request Failed:", error));
    }

    // Initial fetch
    fetchNotesWithSearch();
});