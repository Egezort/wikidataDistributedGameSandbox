// JavaScript for the game
async function fetchItem() {
    const response = await fetch('/api/get_item');
    const data = await response.json();
    if (data.error) {
        alert("No items available.");
    } else {
        document.getElementById('item').textContent = data.itemLabel;
        document.getElementById('team').textContent = data.teamLabel;
        document.getElementById('game').dataset.itemId = data.item.split('/').pop();
        document.getElementById('game').dataset.teamId = data.team.split('/').pop();
    }
}

async function submitAnswer(correct) {
    const game = document.getElementById('game');
    const itemId = game.dataset.itemId;
    const teamId = game.dataset.teamId;

    const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, correct, team_id: teamId })
    });

    const result = await response.json();
    if (result.success) {
        alert("Response recorded!");
        fetchItem(); // Fetch the next item
    } else {
        alert("Error recording response.");
    }
}

fetchItem(); // Load the first item on page load