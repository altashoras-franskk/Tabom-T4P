export type LifeStats = {
  births: number;
  deaths: number;
  mutations: number;       // micro metamorphosis count
  speciation: number;      // new archetypes/species events
  lastEvent: string;
};

export const createLifeStats = (): LifeStats => ({
  births: 0,
  deaths: 0,
  mutations: 0,
  speciation: 0,
  lastEvent: '',
});
