export function computeStandings(matches) {
  const standings = {};

  // Initialize
  matches.forEach(match => {
    if (match.stage !== 'GROUP_STAGE') return;
    const group = match.group;
    if (!standings[group]) {
      standings[group] = {};
    }
    
    [match.homeTeam, match.awayTeam].forEach(team => {
      if (team && team.id && !standings[group][team.id]) {
        standings[group][team.id] = {
          team: team,
          playedGames: 0,
          won: 0,
          draw: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        };
      }
    });
  });

  // Calculate stats
  matches.forEach(match => {
    if (match.stage !== 'GROUP_STAGE' || match.status !== 'FINISHED') return;
    
    const group = match.group;
    const home = match.homeTeam.id;
    const away = match.awayTeam.id;
    
    const homeScore = match.score.fullTime.home;
    const awayScore = match.score.fullTime.away;

    if (homeScore !== null && awayScore !== null) {
      standings[group][home].playedGames++;
      standings[group][away].playedGames++;
      
      standings[group][home].goalsFor += homeScore;
      standings[group][home].goalsAgainst += awayScore;
      standings[group][away].goalsFor += awayScore;
      standings[group][away].goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        standings[group][home].won++;
        standings[group][home].points += 3;
        standings[group][away].lost++;
      } else if (homeScore < awayScore) {
        standings[group][away].won++;
        standings[group][away].points += 3;
        standings[group][home].lost++;
      } else {
        standings[group][home].draw++;
        standings[group][away].draw++;
        standings[group][home].points += 1;
        standings[group][away].points += 1;
      }
      
      standings[group][home].goalDifference = standings[group][home].goalsFor - standings[group][home].goalsAgainst;
      standings[group][away].goalDifference = standings[group][away].goalsFor - standings[group][away].goalsAgainst;
    }
  });

  // Sort and format
  const result = [];
  Object.keys(standings).sort().forEach(groupName => {
    const table = Object.values(standings[groupName]).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    
    result.push({
      group: groupName.replace('_', ' '),
      table: table.map((item, index) => ({ ...item, position: index + 1 }))
    });
  });

  return result;
}
