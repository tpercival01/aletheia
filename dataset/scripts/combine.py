import os
import glob
import pandas as pd

def combine_csvs(input_folder, output_file):
    csv_files = glob.glob(os.path.join(input_folder, "*.csv"))
    
    if not csv_files:
        print("No CSV files found in this folder.")
        return
    
    df_list = [pd.read_csv(f) for f in csv_files]
    combined_df = pd.concat(df_list, ignore_index=True)
    
    combined_df.to_csv(output_file, index=False)
    print(f"Combined {len(csv_files)} CSV files into {output_file}")

if __name__ == "__main__":
    combine_csvs("dataset/data/finished", "final.csv")