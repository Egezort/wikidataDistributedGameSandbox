document.addEventListener('DOMContentLoaded', () => {
    const taskContainer = document.getElementById('task-container');
    const submitButton = document.getElementById('submit-button');

    fetch('api.php?action=getTask')
        .then(response => response.json())
        .then(data => {
            taskContainer.innerHTML = `<p>${data.task}</p>`;
        })
        .catch(error => console.error('Error fetching task:', error));

    submitButton.addEventListener('click', () => {
        alert('Task submitted!');
    });
});