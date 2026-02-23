export const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const A4 = 440;

export const TUNINGS = {
  std:      { id:'std',      name:'Standard',        label:'EADGBE',    tuning:[4,9,2,7,11,4], stringNames:['E','A','D','G','B','e'] },
  halfDown: { id:'halfDown', name:'Half Step Down',   label:'E\u266dA\u266dD\u266dG\u266dB\u266de\u266d', tuning:[3,8,1,6,10,3], stringNames:['E\u266d','A\u266d','D\u266d','G\u266d','B\u266d','e\u266d'] },
  dropD:    { id:'dropD',    name:'Drop D',           label:'DADGBE',    tuning:[2,9,2,7,11,4], stringNames:['D','A','D','G','B','e'] },
  openG:    { id:'openG',    name:'Open G',           label:'DGDGBD',    tuning:[2,7,2,7,11,2], stringNames:['D','G','D','G','B','D'] },
  openD:    { id:'openD',    name:'Open D',           label:'DADF#AD',   tuning:[2,9,2,6,9,2],  stringNames:['D','A','D','F#','A','D'] },
  dadgad:   { id:'dadgad',   name:'DADGAD',           label:'DADGAD',    tuning:[2,9,2,7,9,2],  stringNames:['D','A','D','G','A','D'] }
};

export const INTERVALS = [
  {semi:1,  name:'Minor 2nd',   abbr:'m2'},
  {semi:2,  name:'Major 2nd',   abbr:'M2'},
  {semi:3,  name:'Minor 3rd',   abbr:'m3'},
  {semi:4,  name:'Major 3rd',   abbr:'M3'},
  {semi:5,  name:'Perfect 4th', abbr:'P4'},
  {semi:6,  name:'Tritone',     abbr:'TT'},
  {semi:7,  name:'Perfect 5th', abbr:'P5'},
  {semi:8,  name:'Minor 6th',   abbr:'m6'},
  {semi:9,  name:'Major 6th',   abbr:'M6'},
  {semi:10, name:'Minor 7th',   abbr:'m7'},
  {semi:11, name:'Major 7th',   abbr:'M7'},
  {semi:12, name:'Octave',      abbr:'P8'}
];

export const CHORD_TYPES = [
  {id:'maj',  name:'Major',  sym:'',     iv:[0,4,7],    fm:['R','3','5']},
  {id:'min',  name:'Minor',  sym:'m',    iv:[0,3,7],    fm:['R','\u266d3','5']},
  {id:'7',    name:'Dom 7',  sym:'7',    iv:[0,4,7,10], fm:['R','3','5','\u266d7']},
  {id:'maj7', name:'Maj 7',  sym:'maj7', iv:[0,4,7,11], fm:['R','3','5','7']},
  {id:'m7',   name:'Min 7',  sym:'m7',   iv:[0,3,7,10], fm:['R','\u266d3','5','\u266d7']},
  {id:'dim',  name:'Dim',    sym:'dim',  iv:[0,3,6],    fm:['R','\u266d3','\u266d5']},
  {id:'aug',  name:'Aug',    sym:'+',    iv:[0,4,8],    fm:['R','3','#5']},
  {id:'sus2', name:'Sus 2',  sym:'sus2', iv:[0,2,7],    fm:['R','2','5']},
  {id:'sus4', name:'Sus 4',  sym:'sus4', iv:[0,5,7],    fm:['R','4','5']}
];
