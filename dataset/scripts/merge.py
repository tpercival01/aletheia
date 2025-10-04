import pandas as pd
import glob
import os

base_dir = os.path.dirname(os.path.dirname(__file__))
output_dir = os.path.join(base_dir, "data", "human")
os.makedirs(output_dir, exist_ok=True)
output_file = os.path.join(output_dir, "reddit_merged.csv")

files = glob.glob(os.path.join(output_dir, "*.csv"))
dfs = [pd.read_csv(f) for f in files]
df = pd.concat(dfs, ignore_index=True).drop_duplicates(subset="id")
df.to_csv(output_file, index=False)