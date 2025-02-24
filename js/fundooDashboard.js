document.addEventListener("DOMContentLoaded", function () {
    const noteInput = document.getElementById("noteInput"); // Textarea input
    const notesGrid = document.querySelector(".fundoo-dash-notes-grid"); // Notes container
    const modalNoteContent = document.getElementById("modalNoteContent"); // Modal textarea
    const saveNoteBtn = document.getElementById("saveNoteButton"); // Save Button (new)
    const jwtToken = localStorage.getItem("jwtToken"); // Get JWT token from local storage
    let currentView = "notes"; // Tracks current tab (notes, archive, trash)

    if (!jwtToken) {
        alert("You must be logged in to create and view notes.");
        return;
    }

    // Fetch Notes on Page Load
    fetchNotes();

    // Navbar Click Handlers
    document.getElementById("notesTab").addEventListener("click", function () {
        currentView = "notes";
        fetchNotes();
    });

    document.getElementById("archiveTab").addEventListener("click", function () {
        currentView = "archive";
        fetchNotes();
    });

    document.getElementById("trashTab").addEventListener("click", function () {
        currentView = "trash";
        fetchNotes();
    });

    saveNoteBtn.addEventListener("click", function () {
        const content = noteInput.value.trim();
        if (content) {
            saveNote(content);
        }
    });

    function fetchNotes() {
        fetch("http://localhost:3000/api/v1/notes/getNote", {
            method: "GET",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(data => {
            console.log("API Response:", data);  
    
            if (!data.notes || !Array.isArray(data.notes)) {
                console.error("Invalid API response format:", data);
                return;
            }
    
            notesGrid.innerHTML = ""; // Clear existing notes
    
            let added = false;
            data.notes.forEach(note => {
                console.log("Processing Note:", note);  
    
                if (note.isDeleted) {
                    // ✅ Ensure Deleted Notes ONLY Appear in Trash
                    if (currentView === "trash") {
                        addNoteToUI(note.id, note.content, note.colour, note.isArchive);
                        added = true;
                    }
                } else if (note.isArchive) {
                    // ✅ Ensure Archived Notes DO NOT Appear if Deleted
                    if (currentView === "archive" && !note.isDeleted) {
                        addNoteToUI(note.id, note.content, note.colour, note.isArchive);
                        added = true;
                    }
                } else {
                    // ✅ Ensure Notes Appear Only in Notes Section
                    if (currentView === "notes") {
                        addNoteToUI(note.id, note.content, note.colour, note.isArchive);
                        added = true;
                    }
                }
            });
    
            if (!added) {
                console.warn("No notes matched the current filter.");
            }
        })
        .catch(error => console.error("Request Failed:", error));
    }    
    

    function saveNote(content) {
        fetch("http://localhost:3000/api/v1/notes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ note: { content } })
        })
        .then(response => response.json())
        .then(data => {
            if (data.note) {
                console.log("Note Saved:", data.note);
                addNoteToUI(data.note.id, data.note.content, data.note.colour, data.note.isArchive);
                noteInput.value = ""; // Clear input field
                
                setTimeout(fetchNotes, 10000); // Give more time for backend update
            } else {
                console.error("Error:", data.errors);
            }
        })
        .catch(error => console.error("Request Failed:", error));
    }
    
    

    function addNoteToUI(id, content, colour = "white", isArchived = false) {
        const noteDiv = document.createElement("div");
        noteDiv.classList.add("fundoo-dash-note");
        noteDiv.dataset.id = id;
        noteDiv.style.backgroundColor = colour;
        noteDiv.innerHTML = `
            <p>${content}</p>
            <div class="note-icons">
                <i class="fas fa-box-archive archive-icon" title="Archive"></i>
                <i class="fas fa-trash delete-icon" title="Delete"></i>
            </div>
        `;

        noteDiv.addEventListener("click", function (event) {
            if (event.target.classList.contains("delete-icon") || event.target.classList.contains("archive-icon")) return;
            modalNoteContent.value = content;
            const noteModal = new bootstrap.Modal(document.getElementById("noteModal"));
            noteModal.show();
        });

        noteDiv.querySelector(".archive-icon").addEventListener("click", function () {
            toggleArchive(id);
        });

        noteDiv.querySelector(".delete-icon").addEventListener("click", function () {
            toggleTrash(id);
        });

        notesGrid.prepend(noteDiv);
    }

    function toggleArchive(id) {
        fetch(`http://localhost:3000/api/v1/notes/archiveToggle/${id}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(() => {
            fetchNotes();
        })
        .catch(error => console.error("Error:", error));
    }

    function toggleTrash(id) {
        fetch(`http://localhost:3000/api/v1/notes/trashToggle/${id}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(() => {
            fetchNotes(); // 🔄 Refresh notes to move it to Trash
        })
        .catch(error => console.error("Error:", error));
    }
});
