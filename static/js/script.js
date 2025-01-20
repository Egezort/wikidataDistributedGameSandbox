document.addEventListener('DOMContentLoaded', function() {
    console.log('Game loaded');
    // Example JS logic for interaction
    fetch('api.php?action=tiles&num=1')
        .then(response => response.json())
        .then(data => {
            console.log('Tiles:', data);
            const container = document.getElementById('game-container');
            if (data.tiles) {
                container.innerHTML = `<pre>${JSON.stringify(data.tiles, null, 2)}</pre>`;
            } else {
                container.innerHTML = '<p>No tiles available</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching tiles:', error);
        });
});